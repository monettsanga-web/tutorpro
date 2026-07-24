'use client';

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Star,
  Trophy,
  Volume2,
  Sparkles,
  ArrowLeft,
  Check,
  RotateCcw,
  Zap,
  ArrowRight,
  Award,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ====================================================================
// 1. Exact 16 Vocabulary Topics based on the attached screenshots
// ====================================================================

const TOPICS = [
  {
    id: 'furniture',
    title: 'Furniture in English',
    description: 'Let\'s explore the furniture in our homes. Can you find all the items in this English game?',
    wordsCount: 11,
    icon: '🛋️',
    previewIcons: ['🗄️', '🛋️', '🪑'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    vocabulary: [
      { word: 'cabinet', emoji: '🗄️', definition: 'A cupboard with shelves or drawers for storage' },
      { word: 'sofa', emoji: '🛋️', definition: 'A long comfortable seat for multiple people' },
      { word: 'table', emoji: '🪑', definition: 'A piece of furniture with a flat top and legs' },
      { word: 'bed', emoji: '🛏️', definition: 'A piece of furniture used for sleeping' },
      { word: 'lamp', emoji: '💡', definition: 'A device that provides artificial light' },
      { word: 'chair', emoji: '🪑', definition: 'A seat for one person, with a back and legs' }
    ]
  },
  {
    id: 'rooms',
    title: 'Rooms in English',
    description: 'Every room in our houses has a special name! Let\'s play this English language game and learn.',
    wordsCount: 6,
    icon: '🏠',
    previewIcons: ['🛏️', '🍳', '🛁'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '4 min',
    vocabulary: [
      { word: 'bedroom', emoji: '🛏️', definition: 'The room where you sleep at night' },
      { word: 'kitchen', emoji: '🍳', definition: 'The room where food is prepared and cooked' },
      { word: 'bathroom', emoji: '🛁', definition: 'The room where you take a bath or wash your hands' },
      { word: 'living room', emoji: '📺', definition: 'The room where families relax and watch TV' },
      { word: 'dining room', emoji: '🍽️', definition: 'The room where people eat meals' }
    ]
  },
  {
    id: 'days',
    title: 'Days of the week in English',
    description: 'Learn the words for the days of the week with our English learning games.',
    wordsCount: 7,
    icon: '🗓️',
    previewIcons: ['📅', '📆', '🗓️'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    vocabulary: [
      { word: 'Monday', emoji: '📅', definition: 'The first day of the working week' },
      { word: 'Wednesday', emoji: '📆', definition: 'The middle of the weekday schedule' },
      { word: 'Friday', emoji: '🗓️', definition: 'The last day before the weekend' },
      { word: 'Sunday', emoji: '☀️', definition: 'The final day of the week, a holiday' }
    ]
  },
  {
    id: 'locations',
    title: 'Locations in English',
    description: 'Where do you like to visit? Let\'s learn about places - English learning games are fun!',
    wordsCount: 15,
    icon: '🏫',
    previewIcons: ['🎬', '⛲', '🏡'],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '6 min',
    vocabulary: [
      { word: 'cinema', emoji: '🎬', definition: 'A place where you watch movies' },
      { word: 'park', emoji: '⛲', definition: 'A public green space with trees and fountains' },
      { word: 'house', emoji: '🏡', definition: 'A building where people live' },
      { word: 'school', emoji: '🏫', definition: 'A place where students learn from teachers' }
    ]
  },
  {
    id: 'family',
    title: 'Family members in English',
    description: 'Can you name family members in English? Let\'s check and build your vocabulary!',
    wordsCount: 9,
    icon: '👨‍👩‍👧‍👦',
    previewIcons: ['👨', '👩', '👶'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    vocabulary: [
      { word: 'father', emoji: '👨', definition: 'A male parent' },
      { word: 'mother', emoji: '👩', definition: 'A female parent' },
      { word: 'baby', emoji: '👶', definition: 'A very young child or infant' },
      { word: 'brother', emoji: '👦', definition: 'A male sibling' },
      { word: 'sister', emoji: '👧', definition: 'A female sibling' }
    ]
  },
  {
    id: 'shapes',
    title: 'Shapes in English',
    description: 'Test your knowledge by playing this free game! Explore shapes and forms in English.',
    wordsCount: 3,
    icon: '🔺',
    previewIcons: ['🟣', '🔺', '🟦'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '3 min',
    vocabulary: [
      { word: 'circle', emoji: '🟣', definition: 'A round shape with no corners' },
      { word: 'triangle', emoji: '🔺', definition: 'A shape with three sides and three corners' },
      { word: 'square', emoji: '🟦', definition: 'A shape with four equal sides' }
    ]
  },
  {
    id: 'food',
    title: 'Food in English',
    description: 'Mmm! Let\'s talk about yummy food! Play and learn food words in English.',
    wordsCount: 16,
    icon: '🍕',
    previewIcons: ['🍕', '🎂', '🍔'],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '7 min',
    vocabulary: [
      { word: 'pizza', emoji: '🍕', definition: 'A flat baked bread topped with tomato and cheese' },
      { word: 'cake', emoji: '🎂', definition: 'A sweet dessert often eaten at birthdays' },
      { word: 'burger', emoji: '🍔', definition: 'A round patty of ground meat inside a bun' }
    ]
  },
  {
    id: 'drinks',
    title: 'Drinks in English',
    description: 'Are you thirsty? Let\'s learn about different drinks in English with this game.',
    wordsCount: 13,
    icon: '🥛',
    previewIcons: ['🍹', '🥛', '☕'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    vocabulary: [
      { word: 'juice', emoji: '🍹', definition: 'A sweet liquid drink made from fruit' },
      { word: 'milk', emoji: '🥛', definition: 'A white nutrient-rich liquid from cows' },
      { word: 'coffee', emoji: '☕', definition: 'A warm dark energy drink' }
    ]
  },
  {
    id: 'school_items',
    title: 'School items in English',
    description: 'School is cool! In this free game, you will learn words for school items!',
    wordsCount: 9,
    icon: '✏️',
    previewIcons: ['✏️', '📓', '🎒'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '4 min',
    vocabulary: [
      { word: 'pen', emoji: '✏️', definition: 'An instrument used for writing with ink' },
      { word: 'notebook', emoji: '📓', definition: 'A book with blank pages for writing notes' },
      { word: 'backpack', emoji: '🎒', definition: 'A bag used to carry school items on your back' }
    ]
  },
  {
    id: 'feelings',
    title: 'Feelings in English',
    description: 'Play this free game and explore different emotions and feelings. Don\'t be sad, be happy!',
    wordsCount: 7,
    icon: '😴',
    previewIcons: ['😴', '😡', '😀'],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '5 min',
    vocabulary: [
      { word: 'sleepy', emoji: '😴', definition: 'Feeling tired and wanting to go to bed' },
      { word: 'angry', emoji: '😡', definition: 'Feeling strong displeasure or rage' },
      { word: 'happy', emoji: '😀', definition: 'Feeling good, joyful, and smiling' }
    ]
  },
  {
    id: 'transportation',
    title: 'Transportation in English',
    description: 'Can you ride a bicycle? Or drive a car?! Click on the pictures and learn new English words!',
    wordsCount: 7,
    icon: '✈️',
    previewIcons: ['✈️', '🚗', '🚌'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '4 min',
    vocabulary: [
      { word: 'airplane', emoji: '✈️', definition: 'A vehicle that flies in the sky' },
      { word: 'car', emoji: '🚗', definition: 'A road vehicle with four wheels' },
      { word: 'bus', emoji: '🚌', definition: 'A large road vehicle that carries many passengers' }
    ]
  },
  {
    id: 'hobbies',
    title: 'Hobbies in English',
    description: 'Discover a new hobby you\'ll love through this language game! Learn 14 new English words.',
    wordsCount: 14,
    icon: '🎵',
    previewIcons: ['🎵', '🦋', '🪀'],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '6 min',
    vocabulary: [
      { word: 'music', emoji: '🎵', definition: 'Listening to pleasant sounds and songs' },
      { word: 'catching', emoji: '🦋', definition: 'Trying to capture beautiful butterflies' },
      { word: 'yoyo', emoji: '🪀', definition: 'Playing with a toy that spins up and down on a string' }
    ]
  },
  {
    id: 'colors',
    title: 'Colours in English',
    description: 'Can you name all the colours of the rainbow in English? Let\'s find out!',
    wordsCount: 11,
    icon: '🌈',
    previewIcons: ['💛', '❤️', '💚'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    vocabulary: [
      { word: 'yellow', emoji: '💛', definition: 'The bright colour of sunshine' },
      { word: 'red', emoji: '❤️', definition: 'The warm color of roses and apples' },
      { word: 'green', emoji: '💚', definition: 'The colour of leaves and grass' }
    ]
  },
  {
    id: 'numbers',
    title: 'Numbers 1-20 in English',
    description: 'Let\'s learn to count from 1 to 20 in English! Numbers learning games are fun.',
    wordsCount: 20,
    icon: '🔢',
    previewIcons: ['⑬', '4️⃣', '⑩'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '6 min',
    vocabulary: [
      { word: 'thirteen', emoji: '⑬', definition: 'The number after twelve' },
      { word: 'four', emoji: '4️⃣', definition: 'The number after three' },
      { word: 'ten', emoji: '⑩', definition: 'The number after nine' }
    ]
  },
  {
    id: 'toys',
    title: 'Toys in English',
    description: 'What is your favourite toy? A teddy bear? A robot? You can find them all in this free game!',
    wordsCount: 10,
    icon: '🧸',
    previewIcons: ['🚗', '🤖', '🧸'],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    vocabulary: [
      { word: 'toy car', emoji: '🚗', definition: 'A small play vehicle' },
      { word: 'robot', emoji: '🤖', definition: 'A mechanical moving toy friend' },
      { word: 'teddy bear', emoji: '🧸', definition: 'A soft stuffed animal bear' }
    ]
  },
  {
    id: 'body_parts',
    title: 'Body parts in English',
    description: 'Listen to English words and match them with the right picture!',
    wordsCount: 14,
    icon: '🖐️',
    previewIcons: ['🦶', '👃', '🖐️'],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '6 min',
    vocabulary: [
      { word: 'toe', emoji: '🦶', definition: 'One of the digits on your foot' },
      { word: 'nose', emoji: '👃', definition: 'The organ on your face used for breathing and smelling' },
      { word: 'hand', emoji: '🖐️', definition: 'The parts at the end of your arms' }
    ]
  }
];

function GameHeader({ title, subtitle, score, onBack, icon: Icon }) {
  return (
    <div className="game-header" style={{ padding: '16px 20px', background: '#090510', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}><ArrowLeft size={16} /> Back</button>
      <div><span style={{ color: '#bce94e', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 'bold' }}>{subtitle}</span><h2 style={{ fontSize: '1.45rem', fontWeight: '950', color: '#fff', margin: 0 }}>{title}</h2></div>
      <div className="game-score" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(188, 233, 78, 0.08)', border: '1px solid rgba(188, 233, 78, 0.2)', padding: '6px 14px', borderRadius: '20px', color: '#bce94e' }}><Star size={16} fill="currentColor" /><strong>{score}</strong><span>stars</span></div>
    </div>
  )
}

function MemoryMatchGame({ topic, onEarn, onBack }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', maxWidth: '900px', margin: '0 auto' }}>
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

        <div style={{ background: '#150d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px' }}>
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

function GameModeCard({ topic, onChoose }) {
  return (
    <article 
      className="public-teacher-card novakid-style-card"
      style={{ 
        background: '#150d2e', 
        border: '1px solid rgba(188, 233, 78, 0.2)', 
        borderRadius: '20px', 
        padding: '24px', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div>
        {/* Styled card title & details to exactly match your screenshots */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', marginBottom: '14px', letterSpacing: '-0.01em' }}>
          {topic.title}
        </h2>
        
        {/* Three square vocabulary item previews exactly like your screenshots! */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          {topic.previewIcons.map((ico, idx) => (
            <div 
              key={idx}
              style={{
                width: '64px',
                height: '64px',
                background: '#fff',
                border: '2.5px solid #090510',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
            >
              {ico}
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.82rem', color: '#b9adc7', lineHeight: '1.5', marginBottom: '12px' }}>
          {topic.description}
        </p>
        
        <strong style={{ display: 'block', fontSize: '0.78rem', color: '#bce94e', marginBottom: '16px' }}>
          Learn {topic.vocabulary.length} new English words
        </strong>
      </div>

      <button 
        onClick={() => onChoose(topic)}
        className="button button--primary" 
        style={{ 
          background: '#fff', 
          color: '#321568', 
          fontWeight: '900', 
          fontSize: '0.85rem', 
          padding: '10px 24px', 
          borderRadius: '30px', 
          border: 'none',
          boxShadow: '0 4px 12px rgba(255,255,255,0.15)',
          cursor: 'pointer',
          width: 'fit-content'
        }}
      >
        Play Now
      </button>
    </article>
  )
}

export default function StudentGames({ learner, onEarnStars }) {
  const [activeGame, setActiveGame] = useState('');
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
      <section className="games-hero" style={{ background: 'linear-gradient(135deg, #7850c9 0%, #3b0764 100%)', borderRadius: '24px', padding: '30px', display: 'flex', justifyScontent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 20px 50px rgba(120, 80, 201, 0.25)', border: '1px solid rgba(188, 233, 78, 0.15)', marginBottom: '32px' }}>
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
          <span className="kicker" style={{ color: '#bce94e', fontWeight: '900', letterSpacing: '0.08em' }}>FUN FREE ONLINE GAMES</span>
          <h2 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: '900' }}>Fun FREE online games to learn basic English vocabulary</h2>
        </div>
      </div>

      {/* Grid of beautiful cartoonish cards matching screenshots 100% perfectly */}
      <div className="game-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
        {TOPICS.map((topic) => (
          <GameModeCard key={topic.id} topic={topic} onChoose={setActiveGameTopic} />
        ))}
      </div>
    </div>
  );
}
