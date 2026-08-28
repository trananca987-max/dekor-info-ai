"""Экономика SPEC v2.0: два кошелька, стартовый грант, free tier, тарифы.

Единственный источник истины по лимитам и списаниям — сервер (SPEC §0).

Кошельки (SPEC §4.1):
- credits_paid      — купленные и бонусные; не сгорают; любая модель.
- credits_free_daily — бесплатные; обнуляются в 00:00 по таймзоне юзера;
                       тратятся ТОЛЬКО на Low (ни частично, ни как доплата).

Курс кредитов (SPEC §4.2): Low=1, Medium=5, HD=15, варианты=10/пакет.
"""
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo

# === Курс кредитов (SPEC §4.2) ===
COST_LOW = 1
COST_MEDIUM = 5
COST_HD = 15
COST_VARIATIONS = 10

# === Стартовый грант (SPEC §4.3): 15 кредитов в credits_paid, один раз ===
STARTER_GRANT = 15

# === Free tier (SPEC §4.4) ===
DAILY_FREE_DAYS = 7          # дни 1-7: 10 кредитов/день
DAILY_FREE_AMOUNT = 10
WEEKLY_FREE_AMOUNT = 2       # день 8+, не платил: 2 кредита/неделю
NEW_ID_DAILY_AMOUNT = 5      # свежие telegram id: первые сутки 5 вместо 10
NEW_ID_THRESHOLD = 8_000_000_000  # порог монотонно растущего id (конфиг)

# === Тарифы (SPEC §12.2): цены выровнены по номиналам Telegram 50/150/150/350 ===
PACKS = {
    "pack_s": {"credits": 50, "price": 50, "title": "S · 50 кредитов",
               "desc": "10 дизайнов Medium", "badge": None, "kind": "pack",
               "saving": None},
    "pack_m": {"credits": 180, "price": 150, "title": "M · 180 кредитов",
               "desc": "36 дизайнов Medium", "badge": "Выгодно", "kind": "pack",
               "saving": "Экономия 20%"},
    "sub_pro": {"credits": 0, "price": 150, "title": "PRO · 150 ⭐/мес",
                "desc": "40 Medium + 200 черновиков Low", "badge": "Популярный",
                "kind": "sub", "saving": None,
                "quota": {"medium": 40, "low": 200, "hd": 0}},
    "sub_premium": {"credits": 0, "price": 350, "title": "PREMIUM · 350 ⭐/мес",
                    "desc": "20 HD + 60 Medium + 300 Low", "badge": "Максимум",
                    "kind": "sub", "saving": "Дизайн дешевле, чем в PRO",
                    "quota": {"medium": 60, "low": 300, "hd": 20}},
}
PACK_ORDER = ["pack_s", "pack_m", "sub_pro", "sub_premium"]

# Бонусы (перенесены из SPEC 1.x, не противоречат v2.0)
BONUS_REWARDS = {"invite_friend": 10, "subscribe_channel": 5}
FRIEND_BONUS_MONTHLY_CAP = 5


def user_tz(user) -> ZoneInfo:
    try:
        return ZoneInfo(user.timezone or "Europe/Moscow")
    except Exception:
        return ZoneInfo("Europe/Moscow")  # фолбэк UTC+3 (SPEC §14)


def user_now(user) -> datetime:
    return datetime.now(user_tz(user))


def user_today_str(user) -> str:
    return user_now(user).date().isoformat()


def user_iso_week(user) -> str:
    d = user_now(user).date()
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def account_age_days(user, now_utc=None) -> int:
    """Возраст аккаунта в днях (по first_seen_at, фолбэк created_at)."""
    ref = user.first_seen_at or user.created_at
    if not ref:
        return 999
    try:
        now_utc = now_utc or datetime.utcnow()
        ref_naive = ref.replace(tzinfo=None) if ref.tzinfo else ref
        return (now_utc - ref_naive).days
    except Exception:
        return 999


def is_new_telegram_id(telegram_id: int) -> bool:
    """Свежие id (верхний диапазон монотонно растущего идентификатора)."""
    try:
        return int(telegram_id) >= NEW_ID_THRESHOLD
    except (ValueError, TypeError):
        return False


def in_trial_week(user) -> bool:
    """Первые 7 дней с регистрации (день регистрации = день 0)."""
    return account_age_days(user) < DAILY_FREE_DAYS


def sub_active(user) -> bool:
    if user.tier in ("pro", "premium") and user.tier_expires_at:
        try:
            exp = user.tier_expires_at
            exp = exp.replace(tzinfo=None) if exp.tzinfo else exp
            return exp > datetime.utcnow()
        except Exception:
            return False
    return False


def ensure_daily_wallet(user) -> None:
    """Начисляет/обнуляет дневной кошелёк по локальной дате юзера.

    Неизрасходованные кредиты сгорают: кошелёк перезаписывается, не складывается
    (SPEC §4.5). Дни 1-7 и платившие: 10/день; день 8+ неплативший: 2/неделю.
    """
    today = user_today_str(user)
    week = user_iso_week(user)

    if in_trial_week(user) or user.has_ever_paid:
        # Дневная выдача
        if user.free_daily_date != today:
            amount = DAILY_FREE_AMOUNT
            # Свежие telegram id: первые сутки 5 вместо 10 (SPEC §4.5)
            if is_new_telegram_id(user.telegram_id) and account_age_days(user) < 1:
                amount = NEW_ID_DAILY_AMOUNT
            user.free_daily_date = today
            user.credits_free_daily = amount  # перезапись = сгорание остатка
    else:
        # День 8+, не платил: 2 кредита в неделю (ISO-неделя, сброс в понедельник)
        if user.free_week_date != week:
            user.free_week_date = week
            user.free_daily_date = today
            user.credits_free_daily = WEEKLY_FREE_AMOUNT


def grant_starter(user) -> bool:
    """Стартовый грант 15 кредитов — ровно один раз, идемпотентно (SPEC §4.3)."""
    if user.starter_grant_given:
        return False
    user.starter_grant_given = True
    user.credits_paid = (user.credits_paid or 0) + STARTER_GRANT
    if not user.first_seen_at:
        user.first_seen_at = datetime.utcnow()
    return True


def balance_line(user) -> dict:
    """Строка баланса для клиента (SPEC §5). Все состояния из таблицы."""
    ensure_daily_wallet(user)
    paid = user.credits_paid or 0
    free = user.credits_free_daily or 0
    age = account_age_days(user)

    if age < DAILY_FREE_DAYS:
        state = "trial"
        line = f"{paid} кредитов · сегодня {free} черновиков" if free > 0 \
            else f"{paid} кредитов · сегодня 0 из {DAILY_FREE_AMOUNT} черновиков"
    elif user.has_ever_paid:
        state = "paid_daily"
        line = f"{paid} кредитов · сегодня {free} черновиков"
    else:
        state = "weekly"
        line = f"на этой неделе {free} черновика" if free > 0 \
            else "на этой неделе 0 черновиков"

    exhausted = paid < COST_MEDIUM and free <= 0
    return {
        "line": line,
        "state": state,
        "credits_paid": paid,
        "credits_free_daily": free,
        "exhausted": exhausted,
        "trial_days_left": max(0, DAILY_FREE_DAYS - age),
    }
