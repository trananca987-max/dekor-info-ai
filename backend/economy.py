"""Экономика PATCH v2.2: два кошелька, стартовый грант, free tier, тарифы.

Единственный источник истины по лимитам и списаниям — сервер.

Кошельки (§5):
- credits_paid      — купленные и стартовые; не сгорают; любая модель.
- credits_free_daily — бесплатные; обнуляются в 00:00 по таймзоне юзера (фолбэк UTC+3);
                       тратятся ТОЛЬКО на Low, на Medium и HD не применяются
                       даже как частичная доплата.

Курс кредитов (§5): Low=1, Medium=5, HD=15, доп. варианты=10.
Первая генерация пользователя по своему фото — Medium без вотермарки,
за счёт стартовых кредитов (§5).
"""
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo

# === Курс кредитов (§5) ===
COST_LOW = 1
COST_MEDIUM = 5
COST_HD = 15
COST_VARIATIONS = 10

# === Стартовый грант (§5): 15 кредитов в credits_paid, один раз ===
STARTER_GRANT = 15

# === Free tier (§5) ===
DAILY_FREE_DAYS = 7          # дни 1-7: 10 кредитов/день (только Low)
DAILY_FREE_AMOUNT = 10
WEEKLY_FREE_AMOUNT = 2       # день 8+, не платил: 2 кредита/неделю
NEW_ID_DAILY_AMOUNT = 5      # свежие telegram id: первые сутки 5 вместо 10
NEW_ID_THRESHOLD = 8_000_000_000

# === Метрика free_low_cost_per_user_month (§5): алерт на 25 ₽ ===
FREE_LOW_COST_RUB = 0.14     # расчётная себестоимость одной Low-генерации
FREE_LOW_ALERT_RUB = 25.0

# === Тарифы (§6): цены совпадают с номиналами Telegram 50/250/150/350.
# M и PRO больше не совпадают по цене; разовые и подписки разделены на группы.
PACKS = {
    "pack_s": {"credits": 50, "price": 50, "title": "10 дизайнов · 50 ⭐",
               "desc": "50 кредитов — хватит на 10 дизайнов", "badge": None,
               "kind": "pack", "group": "Разовая покупка", "saving": None},
    "pack_m": {"credits": 300, "price": 250, "title": "60 дизайнов · 250 ⭐",
               "desc": "300 кредитов — хватит на 60 дизайнов", "badge": "Выгодно",
               "kind": "pack", "group": "Разовая покупка", "saving": "Экономия 20%"},
    "sub_pro": {"credits": 0, "price": 150, "title": "PRO · 150 ⭐/мес",
                "desc": "40 Medium + 200 быстрых вариантов Low", "badge": None,
                "kind": "sub", "group": "Подписка", "saving": None,
                "quota": {"medium": 40, "low": 200, "hd": 0}},
    "sub_premium": {"credits": 0, "price": 350, "title": "PREMIUM · 350 ⭐/мес",
                    "desc": "20 HD + 60 Medium + 300 Low", "badge": None,
                    "kind": "sub", "group": "Подписка", "saving": None,
                    "quota": {"medium": 60, "low": 300, "hd": 20}},
}
PACK_ORDER = ["pack_s", "pack_m", "sub_pro", "sub_premium"]

# Бонусы (перенесены из SPEC 1.x, не противоречат v2.2)
BONUS_REWARDS = {"invite_friend": 10, "subscribe_channel": 5}
FRIEND_BONUS_MONTHLY_CAP = 5


def user_tz(user) -> ZoneInfo:
    try:
        return ZoneInfo(user.timezone or "Europe/Moscow")
    except Exception:
        return ZoneInfo("Europe/Moscow")  # фолбэк UTC+3 (§5)


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

    Неизрасходованное не накапливается: кошелёк перезаписывается (§5).
    Дни 1-7 и платившие: 10/день; день 8+ неплативший: 2/неделю.
    """
    today = user_today_str(user)
    week = user_iso_week(user)

    if in_trial_week(user) or user.has_ever_paid:
        if user.free_daily_date != today:
            amount = DAILY_FREE_AMOUNT
            if is_new_telegram_id(user.telegram_id) and account_age_days(user) < 1:
                amount = NEW_ID_DAILY_AMOUNT
            user.free_daily_date = today
            user.credits_free_daily = amount  # перезапись = сгорание остатка
    else:
        if user.free_week_date != week:
            user.free_week_date = week
            # free_daily_date НЕ трогаем: если юзер оплатит в тот же день,
            # дневная ветка пере-начислит 10 кредитов сразу (§5).
            user.credits_free_daily = WEEKLY_FREE_AMOUNT


def grant_starter(user) -> bool:
    """Стартовый грант 15 кредитов — ровно один раз, идемпотентно (§5)."""
    if user.starter_grant_given:
        return False
    user.starter_grant_given = True
    user.credits_paid = (user.credits_paid or 0) + STARTER_GRANT
    if not user.first_seen_at:
        user.first_seen_at = datetime.utcnow()
    return True


def balance_line(user) -> dict:
    """Строки баланса для клиента (§7.1, §7.5).

    line — нейтральная строка главного экрана: БЕЗ слов «кредит» и «черновик» (§7.1).
    sheet_line — верхняя строка шита пополнения: текущее состояние (§7.5).
    """
    ensure_daily_wallet(user)
    paid = user.credits_paid or 0
    free = user.credits_free_daily or 0
    age = account_age_days(user)

    if age < DAILY_FREE_DAYS or user.has_ever_paid:
        state = "trial" if age < DAILY_FREE_DAYS else "paid_daily"
        if free > 0:
            line = f"Сегодня бесплатно: {free} дизайнов"
            sheet = f"Осталось {paid} кредитов и {free} дизайнов на сегодня"
        else:
            line = "Бесплатные дизайны на сегодня закончились"
            sheet = f"Осталось {paid} кредитов, бесплатные дизайны на сегодня закончились"
    else:
        state = "weekly"
        if free > 0:
            line = f"На этой неделе бесплатно: {free} дизайна" if free == 2 \
                else f"На этой неделе бесплатно: {free} дизайнов"
            sheet = f"Осталось {paid} кредитов и {free} дизайна на этой неделе"
        else:
            line = "Бесплатные дизайны на этой неделе закончились"
            sheet = f"Осталось {paid} кредитов, бесплатные дизайны недели закончились"

    exhausted = paid < COST_MEDIUM and free <= 0
    return {
        "line": line,
        "sheet_line": sheet,
        "state": state,
        "credits_paid": paid,
        "credits_free_daily": free,
        "exhausted": exhausted,
        "trial_days_left": max(0, DAILY_FREE_DAYS - age),
    }


def free_low_month_cost(free_low_count_this_month: int) -> float:
    """Метрика free_low_cost_per_user_month (§5): расчётная себестоимость
    бесплатных Low-генераций за месяц. Алерт при превышении 25 ₽."""
    return round(free_low_count_this_month * FREE_LOW_COST_RUB, 2)
