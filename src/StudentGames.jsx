'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Star,
  Trophy,
  Volume2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Zap,
  Play,
  ArrowRight,
  User,
  Activity,
  Award,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ====================================================================
// 1. Vocabulary & Topics Datasets
// ====================================================================

const TOPICS = [
  { 
    id: 'furniture', 
    title: 'Furniture in English', 
    icon: '🛋️', 
    wordsCount: 11, 
    difficulty: 'Easy', 
    time: '5 min', 
    stars: 3, 
    progress: 80, 
    illustration: 'couch',
    description: 'Let\'s explore the furniture in our homes. Can you find all items?',
    vocabulary: [
      { word: 'sofa', emoji: '🛋️', definition: 'A long comfortable seat for multiple people' },
      { word: 'table', emoji: '🪑', definition: 'A piece of furniture with a flat top and legs' },
      { word: 'lamp', emoji: '💡', definition: 'A device that provides artificial light' },
      { word: 'bed', emoji: '🛏️', definition: 'A piece of furniture used for sleeping' },
      { word: 'chair', emoji: '🪟', definition: 'A seat for one person, with a back and legs' },
      { word: 'cabinet', emoji: '🗄️', definition: 'A cupboard with shelves or drawers for storage' }
    ]
  },
  { 
    id: 'animals', 
    title: 'Animals in English', 
    icon: '🦁', 
    wordsCount: 14, 
    difficulty: 'Easy', 
    time: '6 min', 
    stars: 4, 
    progress: 65, 
    illustration: 'panda',
    description: 'Meeting wild and farm animals is fun! Perfect for rookie explorers.',
    vocabulary: [
      { word: 'lion', emoji: '🦁', definition: 'A large wild cat known as the king of the jungle' },
      { word: 'panda', emoji: '🐼', definition: 'A large bear-like mammal with black and white markings' },
      { word: 'monkey', emoji: '🐒', definition: 'A clever primate with a long tail that climbs trees' },
      { word: 'rabbit', emoji: '🐰', definition: 'A small animal with long ears that hops' },
      { word: 'elephant', emoji: '🐘', definition: 'A giant mammal with a long trunk and tusks' },
      { word: 'dog', emoji: '🐶', definition: 'A friendly domestic pet that barks' }
    ]
  },
  { 
    id: 'food', 
    title: 'Food in English', 
    icon: '🍕', 
    wordsCount: 16, 
    difficulty: 'Medium', 
    time: '7 min', 
    stars: 5, 
    progress: 90, 
    illustration: 'icecream',
    description: 'Mmm! Let\'s talk about yummy food and drinks. Learn 16 words.',
    vocabulary: [
      { word: 'pizza', emoji: '🍕', definition: 'A baked flatbread topped with tomato and cheese' },
      { word: 'burger', emoji: '🍔', definition: 'A round patty of ground beef inside a bun' },
      { word: 'cake', emoji: '🎂', definition: 'A sweet baked dessert often eaten at birthdays' },
      { word: 'ice cream', emoji: '🍦', definition: 'A cold, sweet frozen dessert made from milk' },
      { word: 'apple', emoji: '🍎', definition: 'A round fruit with red, green, or yellow skin' },
      { word: 'banana', emoji: '🍌', definition: 'A long curved yellow fruit' }
    ]
  },
  { 
    id: 'body_parts', 
    title: 'Body parts in English', 
    icon: '🖐️', 
    wordsCount: 14, 
    difficulty: 'Medium', 
    time: '6 min', 
    stars: 4, 
    progress: 50, 
    illustration: 'hand',
    description: 'Listen to English words and match them with the right picture!',
    vocabulary: [
      { word: 'hand', emoji: '🖐️', definition: 'The end part of a person\'s arm' },
      { word: 'foot', emoji: '🦶', definition: 'The lower part of the leg that touches the ground' },
      { word: 'eye', emoji: '👁️', definition: 'The organ used for seeing' },
      { word: 'ear', emoji: '👂', definition: 'The organ used for hearing' },
      { word: 'nose', emoji: '👃', definition: 'The organ used for smelling' },
      { word: 'mouth', emoji: '👄', definition: 'The opening used for eating and speaking' }
    ]
  }
];

// ====================================================================
// 2. Avatar customizations lists
// ====================================================================
const AVATAR_ITEMS = {
  clothes: [
    { id: 'shirt_green', label: 'Neon Green T-Shirt 👕', cost: 15 },
    { id: 'shirt_purple', label: 'Royal Purple Hoodie 🧥', cost: 25 },
    { id: 'suit_space', label: 'Space Suit Astronaut 🧑‍🚀', cost: 50 }
  ],
  pets: [
    { id: 'pet_cat', label: 'Friendly Kitten 🐱', cost: 30 },
    { id: 'pet_dog', label: 'Cute Puppy 🐶', cost: 35 },
    { id: 'pet_dragon', label: 'Baby Fire Dragon 🐉', cost: 75 }
  ],
  frames: [
    { id: 'frame_gold', label: 'Golden Star Border ✨', cost: 20 },
    { id: 'frame_neon', label: 'Neon Rainbow Glow 🌈', cost: 40 }
  ]
};

export default function StudentGames({ learner, onEarnStars }) {
  const [activeTopic, setActiveGameTopic] = useState(null);
  const [activeGameType, setActiveGameType] = useState(null); // 'match', 'quiz', 'listen', 'avatar'
  
  // Gamification Wallet state
  const [stars, setStars] = useState(learner?.gameStars || 5);
  const [coins, setCoins] = useState(120);
  const [unlockedItems, setUnlockedItems] = useState(['shirt_green']);
  const [equippedAvatar, setEquippedAvatar] = useState({ shirt: 'shirt_green', pet: null, frame: null });

  // Update learner stars upon earning
  const triggerEarn = (amt) => {
    setStars(prev => prev + amt);
    setCoins(prev => prev + (amt * 10)); // 10 coins per star
    onEarnStars?.(amt);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#bce94e', '#7850c9', '#ff9e2c']
    });
  };

  if (activeGameType === 'avatar') {
    return (
      <AvatarCustomizer 
        coins={coins} 
        setCoins={setCoins}
        unlockedItems={unlockedItems}
        setUnlockedItems={setUnlockedItems}
        equippedAvatar={equippedAvatar}
        setEquippedAvatar={setEquippedAvatar}
        onBack={() => setActiveGameType(null)} 
      />
    );
  }

  if (activeGameType === 'match' && activeTopic) {
    return (
      <MemoryMatchGame 
        topic={activeTopic} 
        onEarn={triggerEarn} 
        onBack={() => { setActiveGameType(null); }} 
      />
    );
  }

  if (activeGameType === 'quiz' && activeTopic) {
    return (
      <PictureQuizGame 
        topic={activeTopic} 
        onEarn={triggerEarn} 
        onBack={() => { setActiveGameType(null); }} 
      />
    );
  }

  if (activeGameType === 'listen' && activeTopic) {
    return (
      <ListeningGame 
        topic={activeTopic} 
        onEarn={triggerEarn} 
        onBack={() => { setActiveGameType(null); }} 
      />
    );
  }

  if (activeTopic) {
    return (
      <GameModeSelector 
        topic={activeTopic} 
        onSelectType={setActiveGameType} 
        onBack={() => setActiveGameTopic(null)} 
      />
    );
  }

  return (
    <div className="games-hub portal-view" style={{ background: 'linear-gradient(135deg, #110925 0%, #090510 100%)', color: '#fff', minHeight: '100dvh', padding: '24px' }}>
      {/* Premium Hub Header */}
      <section className="games-hero" style={{ background: 'linear-gradient(135deg, #7850c9 0%, #3b0764 100%)', borderRadius: '24px', padding: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 20px 50px rgba(120, 80, 201, 0.25)', border: '1px solid rgba(188, 233, 78, 0.15)', marginBottom: '32px' }}>
        <div>
          <span className="portal-kicker" style={{ color: '#bce94e', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>TutorPro English PH Game Arena</span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '950', color: '#fff', letterSpacing: '-0.02em', margin: '6px 0' }}>English is your Superpower! ⚡</h1>
          <p style={{ color: '#e9d5ff', fontSize: '0.92rem', margin: '0 0 16px 0', maxWidth: '500px' }}>
            Earn stars, collect shiny gold coins, and customize your special cartoon avatar by playing games!
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setActiveGameType('avatar')}
              className="portal-primary-button" 
              style={{ background: '#bce94e', color: '#090510', margin: 0, fontWeight: '900', padding: '10px 20px', borderRadius: '12px' }}
            >
              👑 Customize My Avatar
            </button>
          </div>
        </div>

        {/* Gamified Score wallets */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 20px', borderRadius: '16px', textAlign: 'center', minWidth: '100px' }}>
            <Star size={24} fill="#ff9e2c" color="#ff9e2c" style={{ margin: '0 auto 4px auto' }} />
            <small style={{ display: 'block', fontSize: '0.62rem', color: '#b9adc7', textTransform: 'uppercase', fontWeight: 'bold' }}>All Stars</small>
            <strong style={{ fontSize: '1.45rem', color: '#fff' }}>{stars}</strong>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 20px', borderRadius: '16px', textAlign: 'center', minWidth: '100px' }}>
            <Zap size={24} fill="#ffd700" color="#ffd700" style={{ margin: '0 auto 4px auto' }} />
            <small style={{ display: 'block', fontSize: '0.62rem', color: '#b9adc7', textTransform: 'uppercase', fontWeight: 'bold' }}>Gold Coins</small>
            <strong style={{ fontSize: '1.45rem', color: '#ffd700' }}>₱{coins}</strong>
          </div>
        </div>
      </section>

      {/* Topics Header */}
      <div className="section-heading section-heading--split" style={{ marginBottom: '24px' }}>
        <div>
          <span className="kicker" style={{ color: '#bce94e', fontWeight: '900', letterSpacing: '0.08em' }}>CHOOSE YOUR ADVENTURE</span>
          <h2 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: '900' }}>Interactive Vocabulary Topics</h2>
        </div>
      </div>

      {/* Grid of beautiful cartoonish cards */}
      <div className="game-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '24px' }}>
        {TOPICS.map((topic) => (
          <article 
            className="public-teacher-card novakid-style-card" 
            key={topic.id}
            style={{ 
              background: '#150d2e', 
              border: '1px solid rgba(188, 233, 78, 0.2)', 
              borderRadius: '20px', 
              padding: '24px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)', 
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ background: 'rgba(255,255,255,0.05)', fontSize: '2.5rem', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {topic.icon}
              </span>
              <span style={{ background: 'rgba(188, 233, 78, 0.08)', border: '1px solid rgba(188, 233, 78, 0.25)', color: '#bce94e', padding: '3px 8px', borderRadius: '12px', fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase' }}>
                {topic.difficulty}
              </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', marginBottom: '4px' }}>{topic.title}</h3>
            <p style={{ fontSize: '0.78rem', color: '#b9adc7', marginBottom: '14px', minHeight: '38px', lineHeight: '1.4' }}>{topic.description}</p>

            {/* Custom Progress Bar */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#b9adc7', marginBottom: '4px', fontWeight: 'bold' }}>
                <span>Progress</span>
                <span>{topic.progress}% ({topic.wordsCount} learned)</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${topic.progress}%`, background: '#bce94e', borderRadius: '10px' }} />
              </div>
            </div>

            {/* Facts info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginBottom: '16px', fontSize: '0.7rem', color: '#b9adc7' }}>
              <span>⏱️ {topic.time}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Star size={11} fill="#ff9e2c" color="#ff9e2c" /> {topic.stars} stars earned</span>
            </div>

            {/* Play Button */}
            <button 
              onClick={() => setActiveGameTopic(topic)}
              className="button button--primary button--full" 
              style={{ background: '#bce94e', color: '#090510', fontWeight: '900', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              Play Now <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

// ====================================================================
// 3. Game Type Selector component
// ====================================================================
function GameModeSelector({ topic, onSelectType, onBack }) {
  const games = [
    { id: 'match', title: 'Memory Match 🎴', description: 'Flip and match vocabulary words to their corresponding cartoon emojis!' },
    { id: 'quiz', title: 'Picture Quiz ❓', description: 'Four choices with random order. Test your visual memory!' },
    { id: 'listen', title: 'Listening Safari 🎧', description: 'Hear native pronunciation and select the correct picture!' }
  ];

  return (
    <div style={{ background: 'linear-gradient(135deg, #110925 0%, #090510 100%)', color: '#fff', minHeight: '100dvh', padding: '24px' }}>
      <button 
        onClick={onBack} 
        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 'bold', marginBottom: '24px' }}
      >
        <ArrowLeft size={14} /> Back to Hub
      </button>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <span style={{ background: 'rgba(120, 80, 201, 0.1)', color: '#bce94e', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          Selected Topic: {topic.title}
        </span>
        <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: '950', marginTop: '12px' }}>Select Game Engine</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {games.map((g) => (
          <div 
            key={g.id}
            onClick={() => onSelectType(g.id)}
            style={{ background: '#150d2e', border: '1px solid rgba(188, 233, 78, 0.15)', borderRadius: '20px', padding: '24px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }}
          >
            <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>{g.title}</h3>
            <p style={{ fontSize: '0.82rem', color: '#b9adc7', lineHeight: '1.5', marginBottom: '16px' }}>{g.description}</p>
            <button className="portal-primary-button" style={{ margin: '0 auto', pointerEvents: 'none' }}>
              Launch Game
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====================================================================
// 4. Memory Match Game Engine
// ====================================================================
function MemoryMatchGame({ topic, onEarn, onBack }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]); // indices
  const [matched, setMatched] = useState([]); // indices
  const [score, setScore] = useState(0);

  // Initialize cards matching word to emoji
  useEffect(() => {
    const wordCards = topic.vocabulary.map((item) => ({ type: 'word', value: item.word, id: `${item.word}-word` }));
    const emojiCards = topic.vocabulary.map((item) => ({ type: 'emoji', value: item.emoji, matchWord: item.word, id: `${item.word}-emoji` }));
    const shuffled = [...wordCards, ...emojiCards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, [topic]);

  const handleCardClick = (index) => {
    if (flipped.length >= 2 || flipped.includes(index) || matched.includes(index)) return;
    
    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    // TTS pronunciation on click
    if (cards[index].type === 'word' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cards[index].value);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }

    if (nextFlipped.length === 2) {
      const first = cards[nextFlipped[0]];
      const second = cards[nextFlipped[1]];
      
      const isMatch = (first.type === 'word' && second.type === 'emoji' && second.matchWord === first.value) ||
                      (first.type === 'emoji' && second.type === 'word' && first.matchWord === second.value);

      if (isMatch) {
        setMatched(prev => [...prev, ...nextFlipped]);
        setFlipped([]);
        setScore(prev => prev + 10);
        onEarn(1);
      } else {
        setTimeout(() => {
          setFlipped([]);
        }, 1200);
      }
    }
  };

  const isCompleted = matched.length === cards.length && cards.length > 0;

  return (
    <div style={{ background: 'linear-gradient(135deg, #110925 0%, #090510 100%)', color: '#fff', minHeight: '100dvh', padding: '24px' }}>
      <GameHeader title="Memory Match 🎴" subtitle={topic.title} score={score} onBack={onBack} icon={Gamepad2} />
      
      {isCompleted ? (
        <VictoryScreen score={score} onBack={onBack} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', maxWidth: '600px', margin: '40px auto' }}>
          {cards.map((card, index) => {
            const isFlipped = flipped.includes(index) || matched.includes(index);
            return (
              <div 
                key={card.id}
                onClick={() => handleCardClick(index)}
                style={{ 
                  height: '110px', 
                  borderRadius: '16px', 
                  background: isFlipped ? '#7850c9' : '#150d2e', 
                  border: isFlipped ? '2px solid #bce94e' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: card.type === 'emoji' ? '2.5rem' : '1rem',
                  fontWeight: 'bold',
                  color: '#fff',
                  transform: isFlipped ? 'rotateY(180deg)' : 'none',
                  transition: 'transform 0.4s'
                }}
              >
                {isFlipped ? (
                  <span style={{ transform: 'rotateY(180deg)', display: 'block' }}>{card.value}</span>
                ) : (
                  <span style={{ fontSize: '2rem' }}>❓</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// 5. Picture Quiz Game Engine
// ====================================================================
function PictureQuizGame({ topic, onEarn, onBack }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const question = topic.vocabulary[index % topic.vocabulary.length];
  const options = topic.vocabulary.map(v => v.emoji).sort(() => Math.random() - 0.5);

  const handlePick = (emoji) => {
    if (selected) return;
    setSelected(emoji);
    if (emoji === question.emoji) {
      setScore(prev => prev + 15);
      onEarn(1);
    }
  };

  const handleNext = () => {
    setIndex(prev => prev + 1);
    setSelected(null);
  };

  const isCorrect = selected === question.emoji;
  const isCompleted = index >= topic.vocabulary.length;

  return (
    <div style={{ background: 'linear-gradient(135deg, #110925 0%, #090510 100%)', color: '#fff', minHeight: '100dvh', padding: '24px' }}>
      <GameHeader title="Picture Quiz ❓" subtitle={topic.title} score={score} onBack={onBack} icon={Gamepad2} />
      
      {isCompleted ? (
        <VictoryScreen score={score} onBack={onBack} />
      ) : (
        <div style={{ maxWidth: '600px', margin: '40px auto', background: '#150d2e', border: '1px solid rgba(188,233,78,0.2)', borderRadius: '24px', padding: '30px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>What is "{question.word}"?</h2>
          <p style={{ color: '#b9adc7', fontSize: '0.9rem', marginBottom: '24px' }}>Hint: {question.definition}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {options.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handlePick(emoji)}
                style={{
                  background: selected === emoji ? (isCorrect ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  fontSize: '3rem',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 'bold', marginBottom: '12px' }}>
                {isCorrect ? 'Correct! +1 star 🌟' : 'Wrong try once more!'}
              </h3>
              <button 
                onClick={handleNext}
                className="portal-primary-button"
                style={{ margin: '0 auto' }}
              >
                Next Word <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// 6. Listening Game Engine
// ====================================================================
function ListeningGame({ topic, onEarn, onBack }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const question = topic.vocabulary[index % topic.vocabulary.length];
  const options = topic.vocabulary.map(v => v.word).sort(() => Math.random() - 0.5);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (question) speak();
  }, [question]);

  const handlePick = (word) => {
    if (selected) return;
    setSelected(word);
    if (word === question.word) {
      setScore(prev => prev + 15);
      onEarn(1);
    }
  };

  const handleNext = () => {
    setIndex(prev => prev + 1);
    setSelected(null);
  };

  const isCorrect = selected === question.word;
  const isCompleted = index >= topic.vocabulary.length;

  return (
    <div style={{ background: 'linear-gradient(135deg, #110925 0%, #090510 100%)', color: '#fff', minHeight: '100dvh', padding: '24px' }}>
      <GameHeader title="Listening Safari 🎧" subtitle={topic.title} score={score} onBack={onBack} icon={Volume2} />
      
      {isCompleted ? (
        <VictoryScreen score={score} onBack={onBack} />
      ) : (
        <div style={{ maxWidth: '600px', margin: '40px auto', background: '#150d2e', border: '1px solid rgba(188,233,78,0.2)', borderRadius: '24px', padding: '30px', textAlign: 'center' }}>
          <div 
            onClick={speak}
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: '#7850c9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px auto', 
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(120, 80, 201, 0.4)'
            }}
          >
            <Volume2 size={32} color="#fff" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>Listen and Choose the word!</h2>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: '20px' }}>{question.emoji}</span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {options.map((word) => (
              <button
                key={word}
                onClick={() => handlePick(word)}
                style={{
                  background: selected === word ? (isCorrect ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  padding: '16px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {word}
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 'bold', marginBottom: '12px' }}>
                {isCorrect ? 'Correct! +1 star 🌟' : 'Wrong try once more!'}
              </h3>
              <button 
                onClick={handleNext}
                className="portal-primary-button"
                style={{ margin: '0 auto' }}
              >
                Next Word <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// 7. Victory Screen
// ====================================================================
function VictoryScreen({ score, onBack }) {
  return (
    <div style={{ maxWidth: '500px', margin: '80px auto', background: '#150d2e', border: '1px solid #bce94e', borderRadius: '24px', padding: '40px', textAlign: 'center' }}>
      <span style={{ fontSize: '4rem', display: 'block', marginBottom: '16px' }}>🏆</span>
      <h2 style={{ fontSize: '2rem', fontWeight: '950', color: '#fff', marginBottom: '8px' }}>Mission Complete!</h2>
      <p style={{ color: '#bce94e', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px' }}>
        You earned +{score / 10} Stars 🌟
      </p>
      <button 
        onClick={onBack}
        className="portal-primary-button"
        style={{ margin: '0 auto', background: '#bce94e', color: '#090510' }}
      >
        Back to games
      </button>
    </div>
  );
}

// ====================================================================
// 8. Avatar Customizer component
// ====================================================================
function AvatarCustomizer({ coins, setCoins, unlockedItems, setUnlockedItems, equippedAvatar, setEquippedAvatar, onBack }) {
  const [activeTab, setActiveTab] = useState('clothes');

  const buyItem = (item) => {
    if (coins < item.cost) {
      alert("You don't have enough Gold Coins! Play more games to earn more ₱ coins.");
      return;
    }
    setCoins(prev => prev - item.cost);
    setUnlockedItems(prev => [...prev, item.id]);
    alert(`🎉 Purchased ${item.label}!`);
  };

  const equipItem = (item) => {
    setEquippedAvatar(prev => ({
      ...prev,
      [activeTab === 'clothes' ? 'shirt' : activeTab === 'pets' ? 'pet' : 'frame']: item.id
    }));
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #110925 0%, #090510 100%)', color: '#fff', minHeight: '100dvh', padding: '24px' }}>
      <button 
        onClick={onBack} 
        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 'bold', marginBottom: '24px' }}
      >
        <ArrowLeft size={14} /> Back to Hub
      </button>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: '950' }}>👑 Avatar Customizer</h2>
        <p style={{ color: '#bce94e', fontWeight: 'bold', marginTop: '4px' }}>My Wallet: ₱{coins} Gold Coins</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Left pane: Avatar Preview */}
        <div style={{ background: '#150d2e', border: '1px solid rgba(188, 233, 78, 0.25)', borderRadius: '24px', padding: '24px', textAlign: 'center', height: 'fit-content' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #7850c9 0%, #3b0764 100%)', 
            margin: '0 auto 16px auto', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '3rem',
            border: equippedAvatar.frame === 'frame_gold' ? '4px solid #ffd700' : equippedAvatar.frame === 'frame_neon' ? '4px solid #ff007f' : '4px solid #bce94e',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            👶
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>My Avatar</h3>
          <div style={{ fontSize: '0.74rem', color: '#b9adc7', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Shirt: {equippedAvatar.shirt === 'shirt_green' ? '🟢 Neon Green' : equippedAvatar.shirt === 'shirt_purple' ? '🟣 Royal Purple' : '🧑‍🚀 Space Suit'}</span>
            <span>Pet: {equippedAvatar.pet === 'pet_cat' ? '🐱 Kitten' : equippedAvatar.pet === 'pet_dog' ? '🐶 Puppy' : equippedAvatar.pet === 'pet_dragon' ? '🐉 Baby Dragon' : 'None'}</span>
          </div>
        </div>

        {/* Right pane: Shop Catalog */}
        <div style={{ background: '#150d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px' }}>
          {/* Shop Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
            {['clothes', 'pets', 'frames'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#7850c9' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {AVATAR_ITEMS[activeTab].map((item) => {
              const isUnlocked = unlockedItems.includes(item.id);
              const isEquipped = equippedAvatar.shirt === item.id || equippedAvatar.pet === item.id || equippedAvatar.frame === item.id;
              return (
                <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.1rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{item.label}</span>
                  <p style={{ fontSize: '0.72rem', color: '#bce94e', fontWeight: 'bold', marginBottom: '12px' }}>Cost: ₱{item.cost} coins</p>
                  
                  {isUnlocked ? (
                    <button 
                      onClick={() => equipItem(item)}
                      style={{
                        width: '100%',
                        background: isEquipped ? '#10b981' : '#7850c9',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {isEquipped ? 'Equipped ✓' : 'Equip'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => buyItem(item)}
                      style={{
                        width: '100%',
                        background: '#bce94e',
                        color: '#090510',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px',
                        fontSize: '0.74rem',
                        fontWeight: '900',
                        cursor: 'pointer'
                      }}
                    >
                      Buy Package
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetIcon() {
  return <Award size={25} />
}
