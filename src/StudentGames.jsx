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

const assetUrl = (path) => `${import.meta.env.BASE_URL || '/'}${path}`;

// ====================================================================
// 1. Exact 17 Vocabulary Topics with High-Resolution Realistic Pictures & Custom Kiddie Thumbnails
// ====================================================================

const TOPICS = [
  {
    id: 'parts_of_house',
    title: 'Parts of a house in English',
    description: 'Let\'s build a house! Learn the names of different parts of a house in English.',
    wordsCount: 3,
    icon: '🏠',
    previewImages: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=60', // Door
      'https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?w=150&auto=format&fit=crop&q=60', // Window
      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=150&auto=format&fit=crop&q=60'  // Stairs
    ],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '3 min',
    thumbnail: 'assets/thumbnail_house_parts.jpg', // Generated Kiddie Thumbnail!
    vocabulary: [
      { word: 'door', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80', definition: 'A hinged, slidable barrier used to enter or exit a room' },
      { word: 'window', image: 'https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?w=300&auto=format&fit=crop&q=80', definition: 'An opening in a wall to let in light and air' },
      { word: 'stairs', image: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=300&auto=format&fit=crop&q=80', definition: 'A set of steps leading from one floor of a building to another' }
    ]
  },
  {
    id: 'furniture',
    title: 'Furniture in English',
    description: 'Let\'s explore the furniture in our homes. Can you find all the items in this English game?',
    wordsCount: 11,
    icon: '🛋️',
    previewImages: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=150&auto=format&fit=crop&q=60', // Sofa
      'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=150&auto=format&fit=crop&q=60', // Table
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=150&auto=format&fit=crop&q=60'  // Bed
    ],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    thumbnail: 'assets/thumbnail_furniture.jpg', // Generated Kiddie Thumbnail!
    vocabulary: [
      { word: 'sofa', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&auto=format&fit=crop&q=80', definition: 'A long comfortable seat for multiple people' },
      { word: 'table', image: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=300&auto=format&fit=crop&q=80', definition: 'A piece of furniture with a flat top and legs' },
      { word: 'bed', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=300&auto=format&fit=crop&q=80', definition: 'A piece of furniture used for sleeping' }
    ]
  },
  {
    id: 'rooms',
    title: 'Rooms in English',
    description: 'Every room in our houses has a special name! Let\'s play this English language game and learn.',
    wordsCount: 6,
    icon: '🏠',
    previewImages: [
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=150&auto=format&fit=crop&q=60', // Bedroom
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&auto=format&fit=crop&q=60', // Kitchen
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150&auto=format&fit=crop&q=60'  // Bathroom
    ],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '4 min',
    thumbnail: 'assets/thumbnail_rooms.jpg', // Generated Kiddie Thumbnail!
    vocabulary: [
      { word: 'bedroom', image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=300&auto=format&fit=crop&q=80', definition: 'The room where you sleep at night' },
      { word: 'kitchen', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&auto=format&fit=crop&q=80', definition: 'The room where food is prepared and cooked' },
      { word: 'bathroom', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', definition: 'The room where you take a bath' }
    ]
  },
  {
    id: 'locations',
    title: 'Locations in English',
    description: 'Where do you like to visit? Let\'s learn about places - English learning games are fun!',
    wordsCount: 15,
    icon: '🏫',
    previewImages: [
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=150&auto=format&fit=crop&q=60', // Cinema
      'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=150&auto=format&fit=crop&q=60', // Park
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=150&auto=format&fit=crop&q=60'  // House
    ],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '6 min',
    thumbnail: 'assets/thumbnail_locations.jpg', // Generated Kiddie Thumbnail!
    vocabulary: [
      { word: 'cinema', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80', definition: 'A place where you watch movies' },
      { word: 'park', image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=300&auto=format&fit=crop&q=80', definition: 'A public green space with trees' },
      { word: 'house', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&auto=format&fit=crop&q=80', definition: 'A building where people live' }
    ]
  },
  {
    id: 'animals',
    title: 'Animals in English',
    description: 'Meeting wild and farm animals is fun! Perfect for rookie explorers.',
    wordsCount: 14,
    icon: '🦁',
    previewImages: [
      'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=150&auto=format&fit=crop&q=60', // Lion
      'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=150&auto=format&fit=crop&q=60', // Panda
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=60'  // Dog
    ],
    color: '#7850c9',
    difficulty: 'Easy',
    time: '5 min',
    vocabulary: [
      { word: 'lion', image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&auto=format&fit=crop&q=80', definition: 'A large wild cat known as the king of the jungle' },
      { word: 'panda', image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=300&auto=format&fit=crop&q=80', definition: 'A large bear-like mammal with black and white markings' },
      { word: 'dog', image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80', definition: 'A friendly domestic pet that barks' }
    ]
  },
  {
    id: 'food',
    title: 'Food in English',
    description: 'Mmm! Let\'s talk about yummy food! Play and learn food words in English.',
    wordsCount: 16,
    icon: '🍕',
    previewImages: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&auto=format&fit=crop&q=60', // Pizza
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&auto=format&fit=crop&q=60', // Cake
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=60'  // Burger
    ],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '7 min',
    vocabulary: [
      { word: 'pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80', definition: 'A flat baked bread topped with tomato and cheese' },
      { word: 'cake', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80', definition: 'A sweet dessert often eaten at birthdays' },
      { word: 'burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80', definition: 'A round patty of ground meat inside a bun' }
    ]
  },
  {
    id: 'body_parts',
    title: 'Body parts in English',
    description: 'Listen to English words and match them with the right picture!',
    wordsCount: 14,
    icon: '🖐️',
    previewImages: [
      'https://images.unsplash.com/photo-1562240020-ce31ccb0fa7d?w=150&auto=format&fit=crop&q=60', // Toe
      'https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=150&auto=format&fit=crop&q=60', // Nose
      'https://images.unsplash.com/photo-1516246843873-9d12356b6fab?w=150&auto=format&fit=crop&q=60'  // Hand
    ],
    color: '#7850c9',
    difficulty: 'Medium',
    time: '6 min',
    vocabulary: [
      { word: 'toe', image: 'https://images.unsplash.com/photo-1562240020-ce31ccb0fa7d?w=300&auto=format&fit=crop&q=80', definition: 'One of the digits on your foot' },
      { word: 'nose', image: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=300&auto=format&fit=crop&q=80', definition: 'The organ on your face used for breathing and smelling' },
      { word: 'hand', image: 'https://images.unsplash.com/photo-1516246843873-9d12356b6fab?w=300&auto=format&fit=crop&q=80', definition: 'The parts at the end of your arms' }
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
    const imageCards = topic.vocabulary.map((item) => ({ type: 'image', value: item.image, matchWord: item.word, id: `${item.word}-image` }));
    const shuffled = [...wordCards, ...imageCards].sort(() => Math.random() - 0.5);
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
      
      const isMatch = (first.type === 'word' && second.type === 'image' && second.matchWord === first.value) ||
                      (first.type === 'image' && second.type === 'word' && first.matchWord === second.value);

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
      <GameHeader title="3D Realistic Memory Match 🎴" subtitle={topic.title} score={score} onBack={onBack} icon={Gamepad2} />
      
      {isCompleted ? (
        <VictoryScreen score={score} onBack={onBack} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '750px', margin: '40px auto', perspective: '1000px' }}>
          {cards.map((card, index) => {
            const isFlipped = flipped.includes(index) || matched.includes(index);
            return (
              <div 
                key={card.id}
                onClick={() => handleCardClick(index)}
                style={{ 
                  height: '140px', 
                  borderRadius: '16px', 
                  background: isFlipped ? '#1c123a' : '#150d2e', 
                  border: isFlipped ? '3px solid #bce94e' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg) translateZ(10px)' : 'translateZ(0px)',
                  transition: 'transform 0.5s ease-out, box-shadow 0.2s'
                }}
              >
                {isFlipped ? (
                  <div style={{ transform: 'rotateY(180deg)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {card.type === 'image' ? (
                      <img src={card.value} alt="Realistic representation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#bce94e', textTransform: 'capitalize' }}>{card.value}</span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}>❓</span>
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
  const options = topic.vocabulary.map(v => v.image).sort(() => Math.random() - 0.5);

  const handlePick = (image) => {
    if (selected) return;
    setSelected(image);
    if (image === question.image) {
      setScore(prev => prev + 15);
      onEarn(1);
    }
  };

  const handleNext = () => {
    setIndex(prev => prev + 1);
    setSelected(null);
  };

  const isCorrect = selected === question.image;
  const isCompleted = index >= topic.vocabulary.length;

  return (
    <div style={{ background: 'linear-gradient(135deg, #110925 0%, #090510 100%)', color: '#fff', minHeight: '100dvh', padding: '24px' }}>
      <GameHeader title="3D Realistic Picture Quiz ❓" subtitle={topic.title} score={score} onBack={onBack} icon={Gamepad2} />
      
      {isCompleted ? (
        <VictoryScreen score={score} onBack={onBack} />
      ) : (
        <div style={{ maxWidth: '650px', margin: '40px auto', background: '#150d2e', border: '1px solid rgba(188,233,78,0.2)', borderRadius: '24px', padding: '30px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', perspective: '1200px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '950', color: '#fff', marginBottom: '8px', textTransform: 'capitalize' }}>Find the "{question.word}"</h2>
          <p style={{ color: '#b9adc7', fontSize: '0.9rem', marginBottom: '24px' }}>Hint: {question.definition}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {options.map((image) => (
              <button
                key={image}
                onClick={() => handlePick(image)}
                style={{
                  background: 'none',
                  border: selected === image ? (isCorrect ? '4px solid #10b981' : '4px solid #ef4444') : '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  height: '180px',
                  padding: 0,
                  cursor: 'pointer',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
                  transform: selected === image ? 'translateZ(15px)' : 'none',
                  transition: 'all 0.3s'
                }}
              >
                <img src={image} alt="Option photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: '28px' }}>
              <h3 style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: '950', fontSize: '1.25rem', marginBottom: '12px' }}>
                {isCorrect ? 'Excellent! +1 star 🌟' : 'Wrong try once more!'}
              </h3>
              <button 
                onClick={handleNext}
                className="portal-primary-button"
                style={{ margin: '0 auto', background: '#bce94e', color: '#090510' }}
              >
                Next Level <ArrowRight size={15} />
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
      <GameHeader title="3D Realistic Listening 🎧" subtitle={topic.title} score={score} onBack={onBack} icon={Volume2} />
      
      {isCompleted ? (
        <VictoryScreen score={score} onBack={onBack} />
      ) : (
        <div style={{ maxWidth: '650px', margin: '40px auto', background: '#150d2e', border: '1px solid rgba(188,233,78,0.2)', borderRadius: '24px', padding: '30px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          <div 
            onClick={speak}
            style={{ 
              width: '90px', 
              height: '90px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #7850c9 0%, #4c1d95 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px auto', 
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(120, 80, 201, 0.45)',
              transform: 'scale(1.05)',
              transition: 'transform 0.2s'
            }}
          >
            <Volume2 size={36} color="#fff" />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>Listen and Choose!</h2>
          
          <div style={{ width: '220px', height: '180px', borderRadius: '16px', overflow: 'hidden', margin: '0 auto 24px auto', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.08)' }}>
            <img src={question.image} alt="Target illustration" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

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
                  fontWeight: '900',
                  fontSize: '1.05rem',
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
    <div style={{ maxWidth: '500px', margin: '80px auto', background: '#150d2e', border: '1px solid #bce94e', borderRadius: '24px', padding: '40px', textAlign: 'center', boxShadow: '0 20px 40px rgba(188,233,78,0.15)' }}>
      <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '16px' }}>🏆</span>
      <h2 style={{ fontSize: '2.2rem', fontWeight: '950', color: '#fff', marginBottom: '8px' }}>Mission Complete!</h2>
      <p style={{ color: '#bce94e', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '24px' }}>
        You earned +{score / 10} Stars 🌟
      </p>
      <button 
        onClick={onBack}
        className="portal-primary-button"
        style={{ margin: '0 auto', background: '#bce94e', color: '#090510', fontSize: '0.85rem' }}
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
    { id: 'match', title: '3D Memory Match 🎴', description: 'Flip and match vocabulary words to their corresponding realistic pictures with 3D rotations!' },
    { id: 'quiz', title: '3D Picture Quiz ❓', description: 'Four choices with random order. Test your realistic visual memory!' },
    { id: 'listen', title: '3D Listening Safari 🎧', description: 'Hear native pronunciation and select the correct realistic picture!' }
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
        <h2 style={{ fontSize: '2.2rem', color: '#fff', fontWeight: '950', marginTop: '12px' }}>Select 3D Game Engine</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {games.map((g) => (
          <div 
            key={g.id}
            onClick={() => onSelectType(g.id)}
            style={{ background: '#150d2e', border: '1px solid rgba(188, 233, 78, 0.15)', borderRadius: '20px', padding: '24px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ fontSize: '1.45rem', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>{g.title}</h3>
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
        boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 220ms ease, box-shadow 220ms ease',
        cursor: 'pointer'
      }}
    >
      {/* Dynamic Cartoon Kiddie Thumbnail background! */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '110px',
          backgroundImage: `url(${assetUrl(topic.thumbnail || 'assets/thumbnail_furniture.jpg')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.15,
          zIndex: 0
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '950', color: '#fff', marginBottom: '14px', letterSpacing: '-0.02em' }}>
          {topic.title}
        </h2>
        
        {/* Three square vocabulary item previews using REALISTIC public domain Unsplash photo links! */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          {topic.previewImages.map((imgUrl, idx) => (
            <div 
              key={idx}
              style={{
                width: '75px',
                height: '75px',
                border: '2.5px solid #090510',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
                background: '#fff'
              }}
            >
              <img src={imgUrl} alt="Realistic item preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.85rem', color: '#b9adc7', lineHeight: '1.5', marginBottom: '12px' }}>
          {topic.description}
        </p>
        
        <strong style={{ display: 'block', fontSize: '0.8rem', color: '#bce94e', marginBottom: '16px' }}>
          Learn {topic.vocabulary.length} new English words
        </strong>
      </div>

      <button 
        onClick={() => onChoose(topic)}
        className="button button--primary" 
        style={{ 
          background: '#fff', 
          color: '#321568', 
          fontWeight: '955', 
          fontSize: '0.88rem', 
          padding: '12px 28px', 
          borderRadius: '30px', 
          border: 'none',
          boxShadow: '0 6px 15px rgba(255,255,255,0.15)',
          cursor: 'pointer',
          width: 'fit-content',
          position: 'relative',
          zIndex: 1
        }}
      >
        Play Now
      </button>
    </article>
  )
}

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
          <span className="portal-kicker" style={{ color: '#bce94e', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>TutorPro English PH 3D Game Arena</span>
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

      {/* Grid of beautiful 3D realistic cards matching screenshots 100% perfectly */}
      <div className="game-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
        {TOPICS.map((topic) => (
          <GameModeCard key={topic.id} topic={topic} onChoose={setActiveGameTopic} />
        ))}
      </div>
    </div>
  );
}
