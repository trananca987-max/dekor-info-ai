"""Экономика (FIX-1 §5, §6): единая валюта — «дизайн», Stars-пакеты, строгий баланс.

Единый источник истины по лимитам и списаниям — сервер.

Кошельки:
- credits_paid       — купленные и стартовые дизайны (не сгорают).
- credits_free_daily — бесплатные дизайны (обновляются периодически).

Пакеты Stars (§5.2):
- 10 дизайнов: 50 ★
- 30 дизайнов: 120 ★ (Выгодно, Экономия 20%)
- 100 дизайнов: 350 ★ (Экономия 30%)
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Себестоимость за одно изображение (§5.2) — одно значение в конфиге
COST_PER_IMAGE_RUB = 0.354

# Стоимость 1 генерации
COST_DESIGN = 1

# Стартовый грант (§5): 15 дизайнов в credits_paid, ровно 1 раз
STARTER_GRANT = 15

# Бесплатные дизайны
DAILY_FREE_DAYS = 7          # первые 7 дней: 2 дизайна/день
DAILY_FREE_AMOUNT = 2
WEEKLY_FREE_AMOUNT = 2       # день 8+, не платил: 2 дизайна/неделю

# Пакеты (§5.2)
PACKS = {
    "pack_10": {
        "designs": 10,
        "price": 50,
        "title": "10 дизайнов",
        "desc": "10 дизайнов · 50 ★",
        "badge": None,
        "saving": None,
    },
    "pack_30": {
        "designs": 30,
        "price": 120,
        "title": "30 дизайнов",
        "desc": "30 дизайнов · 120 ★",
        "badge": "Выгодно",
        "saving": "Экономия 20%",
    },
    "pack_100": {
        "designs": 100,
        "price": 350,
        "title": "100 дизайнов",
        "desc": "100 дизайнов · 350 ★",
        "badge": None,
        "saving": "Экономия 30%",
    },
}
PACK_ORDER = ["pack_10", "pack_30", "pack_100"]

# Бонусы
BONUS_REWARDS = {"invite_friend": 5, "subscribe_channel": 2}
FRIEND_BONUS_MONTHLY_CAP = 5

RU_MONTHS = [
    "", "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
]


def plural_designs(n: int) -> str:
    """Склонение слова дизайн: 1 дизайн, 2 дизайна, 5 дизайнов."""
    n_abs = abs(n)
    if 11 <= (n_abs % 100) <= 19:
        return f"{n} дизайнов"
    last = n_abs % 10
    if last == 1:
        return f"{n} дизайн"
    if 2 <= last <= 4:
        return f"{n} дизайна"
    return f"{n} дизайнов"


def user_tz(user) -> ZoneInfo:
    try:
        return ZoneInfo(user.timezone or "Europe/Moscow")
    except Exception:
        return ZoneInfo("Europe/Moscow")


def user_now(user) -> datetime:
    return datetime.now(user_tz(user))


def user_today_str(user) -> str:
    return user_now(user).date().isoformat()


def user_iso_week(user) -> str:
    d = user_now(user).date()
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def account_age_days(user, now_utc=None) -> int:
    ref = user.first_seen_at or user.created_at
    if not ref:
        return 999
    try:
        now_utc = now_utc or datetime.utcnow()
        ref_naive = ref.replace(tzinfo=None) if ref.tzinfo else ref
        return (now_utc - ref_naive).days
    except Exception:
        return 999


def in_trial_week(user) -> bool:
    return account_age_days(user) < DAILY_FREE_DAYS


def ensure_daily_wallet(user) -> None:
    today = user_today_str(user)
    week = user_iso_week(user)

    if in_trial_week(user) or user.has_ever_paid:
        if user.free_daily_date != today:
            user.free_daily_date = today
            user.credits_free_daily = DAILY_FREE_AMOUNT
    else:
        if user.free_week_date != week:
            user.free_week_date = week
            user.credits_free_daily = WEEKLY_FREE_AMOUNT


def grant_starter(user) -> bool:
    if user.starter_grant_given:
        return False
    user.starter_grant_given = True
    user.credits_paid = (user.credits_paid or 0) + STARTER_GRANT
    if not user.first_seen_at:
        user.first_seen_at = datetime.utcnow()
    return True


def get_next_reset_date_str(user) -> str:
    """Вычисляет дату следующего сброса бесплатных: завтра или след. понедельник."""
    now = user_now(user)
    if in_trial_week(user) or user.has_ever_paid:
        # Сброс завтра в 00:00
        next_date = now.date() + timedelta(days=1)
    else:
        # Сброс в следующий понедельник
        days_ahead = 7 - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_date = now.date() + timedelta(days=days_ahead)

    day = next_date.day
    month = RU_MONTHS[next_date.month] if 1 <= next_date.month <= 12 else ""
    return f"{day} {month}".strip()


def balance_line(user) -> dict:
    """Строки баланса для клиента (§6).

    total_designs = credits_paid + credits_free_daily
    line = '12 дизайнов' | 'Дизайны закончились'
    sub_line = 'Бесплатные обновятся 14 сентября'
    """
    ensure_daily_wallet(user)
    paid = user.credits_paid or 0
    free = user.credits_free_daily or 0
    total = paid + free
    age = account_age_days(user)

    reset_date_str = get_next_reset_date_str(user)
    sub_line = f"Бесплатные обновятся {reset_date_str}"

    if total > 0:
        line = plural_designs(total)
        exhausted = False
    else:
        line = "Дизайны закончились"
        exhausted = True

    state = "trial" if age < DAILY_FREE_DAYS else ("paid_daily" if user.has_ever_paid else "weekly")

    return {
        "line": line,
        "sub_line": sub_line,
        "sheet_line": f"Доступно: {plural_designs(total)} (купленные: {paid}, бесплатные: {free})",
        "state": state,
        "credits_paid": paid,
        "credits_free_daily": free,
        "total_designs": total,
        "exhausted": exhausted,
        "trial_days_left": max(0, DAILY_FREE_DAYS - age),
    }
