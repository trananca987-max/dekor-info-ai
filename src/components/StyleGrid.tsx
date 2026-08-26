import { getStylesByCategory } from '../config/styles';
import type { User } from '../types';

interface Props {
  category: 'interior' | 'outdoor';
  user: User;
  onStyleSelect: (styleId: string) => void;
  onBack: () => void;
}

export default function StyleGrid({ category, onStyleSelect, onBack }: Props) {
  const tg = window.Telegram?.WebApp;
  const categoryStyles = getStylesByCategory(category);

  const handleSelect = (styleId: string) => {
    onStyleSelect(styleId);
  };

  const handleBack = () => {
    tg?.HapticFeedback.impactOccurred('light');
    onBack();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={handleBack} className="btn btn-outline mb-4">
            ← Назад
          </button>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">
              {category === 'interior' ? '🏠 Интерьеры' : '🌳 Дом и дача'}
            </h2>
            <span className="text-white/60">
              {categoryStyles.length} стилей
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categoryStyles.map((style, index) => {
            return (
              <button
                key={style.id}
                onClick={() => handleSelect(style.id)}
                className="style-card-photo relative stagger-item"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="photo-bg">
                  <img
                    src={style.photoUrl}
                    alt={style.name}
                    loading="lazy"
                    className="photo-img"
                  />
                  <div className="photo-overlay" />
                </div>

                <div className="photo-content photo-content-centered">
                  <h3 className="card-title">{style.name}</h3>
                  <p className="card-description">{style.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

