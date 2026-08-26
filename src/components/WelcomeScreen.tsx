// Онбординг — один экран при первом запуске. До результата — никаких решений о деньгах.
import { User } from '../types';
import BeforeAfter from './BeforeAfter';

interface Props {
  user: User;
  onSubscribe: () => void;
}

export default function WelcomeScreen({ onSubscribe }: Props) {
  const tg = window.Telegram?.WebApp;

  const handleUpload = () => {
    tg?.HapticFeedback.impactOccurred('medium');
    // подписка не блокирует: проверяем мягко, но не прячем кнопку загрузки
    onSubscribe();
  };

  return (
    <div className="screen">
      <div className="body">
        <h1 className="screen" style={{ marginTop: 14 }}>
          Посмотрите, как будет выглядеть ваша комната
        </h1>
        <p className="sub" style={{ marginBottom: 16 }}>
          Загрузите фото — получите дизайн за 30 секунд
        </p>

        <BeforeAfter
          before="/styles/_before.jpg"
          after="/styles/modern.jpg"
          height={250}
          labelAfter="После"
        />

        <div className="banner" onClick={handleUpload}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>2 бесплатные генерации</div>
            <div className="tiny">уже на вашем балансе · без карты</div>
          </div>
        </div>
      </div>

      <div className="foot">
        <button className="btn" onClick={handleUpload}>Загрузить фото комнаты</button>
        <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => {
          tg?.openTelegramLink('https://t.me/stroitelinfo');
        }}>
          Посмотреть примеры
        </button>
      </div>
    </div>
  );
}
