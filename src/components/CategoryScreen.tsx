interface Props {
  onSelect: (category: 'interior' | 'outdoor') => void;
}

export default function CategoryScreen({ onSelect }: Props) {
  const tg = window.Telegram?.WebApp;

  const handleSelect = (category: 'interior' | 'outdoor') => {
    tg?.HapticFeedback.impactOccurred('medium');
    onSelect(category);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8 animate-fade-in-up">
          <h2 className="text-3xl font-bold mb-2">
            Выберите <span className="text-gradient-accent">категорию</span>
          </h2>
          <p className="text-white/60">
            Что хотите преобразить?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Интерьеры */}
          <button
            onClick={() => handleSelect('interior')}
            className="card p-8 hover:scale-105 transition-all duration-300 ripple stagger-item"
          >
            <div className="text-7xl mb-4 animate-bounce">🏠</div>
            <h3 className="text-2xl font-bold mb-2">Интерьеры</h3>
            <p className="text-white/60 mb-4">
              Преобразите комнаты вашего дома
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="badge badge-free">8 стилей</span>
              <span className="badge badge-pro">редизайн · пустая · обставить</span>
            </div>
          </button>

          {/* Дом и дача — равноправное направление (дифференциатор рынка) */}
          <button
            onClick={() => handleSelect('outdoor')}
            className="card p-8 hover:scale-105 transition-all duration-300 ripple stagger-item"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="text-7xl mb-4 animate-bounce" style={{ animationDelay: '0.1s' }}>🌳</div>
            <h3 className="text-2xl font-bold mb-2">Дом и дача</h3>
            <p className="text-white/60 mb-4">
              Участок, беседка, зона BBQ — то, что не умеют западные аналоги
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="badge badge-free">10 стилей</span>
              <span className="badge badge-pro">ландшафт · терраса · беседка</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
