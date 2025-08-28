const { useState, useEffect } = React;

// Rate limiting utility for OpenAI API
class APIRateLimiter {
  constructor() {
    this.lastRequestTime = 0;
    this.minDelay = 2000; // 2 seconds between requests
    this.requestQueue = [];
    this.isProcessing = false;
  }

  async makeRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();

      try {
        // Ensure minimum delay between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.minDelay) {
          await new Promise(res => setTimeout(res, this.minDelay - timeSinceLastRequest));
        }

        const result = await this.retryRequest(requestFn);
        this.lastRequestTime = Date.now();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  async retryRequest(requestFn, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await requestFn();
        return result;
      } catch (error) {
        if (error.status === 429 && attempt < maxRetries) {
          // Exponential backoff for rate limiting
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`Rate limit hit, retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        throw error;
      }
    }
  }
}

// Global rate limiter instance
const apiLimiter = new APIRateLimiter();

// Auth/API helpers
const API_BASE = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;

const authStorage = {
  getToken: () => localStorage.getItem('hg_token') || null,
  setToken: (t) => localStorage.setItem('hg_token', t),
  clear: () => localStorage.removeItem('hg_token')
};

async function apiRegister(name, email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Registration failed (${res.status})`);
    return data;
  } catch (e) {
    throw new Error(e.message || 'Registration failed');
  }
}

async function apiLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Login failed (${res.status})`);
    return data;
  } catch (e) {
    throw new Error(e.message || 'Login failed');
  }
}

async function apiMe(token) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Auth check failed');
    return data;
  } catch (e) {
    throw new Error(e.message || 'Auth check failed');
  }
}

// Comprehensive Health Knowledge Base
const healthKnowledgeBase = {
  // COVID-19 Information
  covid: {
    keywords: ['covid', 'coronavirus', 'covid-19', 'covid19', 'corona', 'pandemic'],
    response: "COVID-19 symptoms typically include: fever, cough, fatigue, body aches, sore throat, headache, loss of taste/smell, and shortness of breath. Severe symptoms like difficulty breathing require immediate medical attention. Get tested if you have symptoms and follow local health guidelines. This information is for general guidance only - consult healthcare professionals for medical advice."
  },

  // Blood Pressure
  bloodPressure: {
    keywords: ['blood pressure', 'hypertension', 'bp', 'high blood pressure', 'lower blood pressure'],
    response: "To help manage blood pressure naturally: 1) Exercise regularly (30 min/day), 2) Reduce sodium intake (<2300mg/day), 3) Maintain healthy weight, 4) Limit alcohol, 5) Manage stress through meditation/yoga, 6) Get adequate sleep (7-9 hours), 7) Eat potassium-rich foods. Always consult your doctor before making changes to medications or treatment plans."
  },

  // Heart Health
  heartHealth: {
    keywords: ['heart health', 'cardiovascular', 'heart disease', 'cholesterol', 'heart attack'],
    response: "Heart-healthy lifestyle includes: eating omega-3 rich fish (salmon, sardines), leafy greens, berries, nuts, olive oil, and whole grains. Limit processed foods, trans fats, and excessive saturated fats. Regular exercise, not smoking, managing stress, and maintaining healthy weight are crucial. Get regular checkups including cholesterol and blood pressure monitoring."
  },

  // Hydration
  water: {
    keywords: ['water', 'hydration', 'drink', 'fluid', 'dehydration'],
    response: "Most adults need about 8 glasses (64 oz) of water daily, but this varies based on activity level, climate, and health conditions. Signs of good hydration include pale yellow urine and feeling energetic. Increase intake during exercise, hot weather, or illness. Listen to your body's thirst signals and consult your doctor if you have kidney or heart conditions."
  },

  // Diabetes
  diabetes: {
    keywords: ['diabetes', 'blood sugar', 'glucose', 'insulin', 'diabetic'],
    response: "Diabetes warning signs include: frequent urination, excessive thirst, unexplained weight loss, fatigue, blurred vision, slow-healing cuts, and tingling in hands/feet. Risk factors include family history, obesity, sedentary lifestyle, and age over 45. Early detection and management are crucial. Please get tested if you experience these symptoms."
  },

  // Nutrition
  nutrition: {
    keywords: ['nutrition', 'diet', 'healthy eating', 'vitamins', 'minerals', 'food'],
    response: "A balanced diet includes: plenty of fruits and vegetables (5-9 servings daily), whole grains, lean proteins, and healthy fats. Limit processed foods, added sugars, and excessive sodium. Stay hydrated and consider portion control. Individual needs vary based on age, activity level, and health conditions. Consult a nutritionist for personalized advice."
  },

  // Exercise & Fitness
  exercise: {
    keywords: ['exercise', 'fitness', 'workout', 'physical activity', 'gym'],
    response: "Adults should aim for 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity weekly, plus 2+ days of strength training. Start slowly if you're new to exercise. Activities can include walking, swimming, cycling, or dancing. Always consult your doctor before starting a new exercise program, especially if you have health conditions."
  },

  // Sleep
  sleep: {
    keywords: ['sleep', 'insomnia', 'tired', 'fatigue', 'rest'],
    response: "Adults need 7-9 hours of quality sleep nightly. Good sleep hygiene includes: consistent bedtime/wake times, cool dark room, limiting screens before bed, avoiding caffeine late in day, and creating a relaxing bedtime routine. Poor sleep affects immune function, weight, and mental health. Consult a doctor for persistent sleep problems."
  },

  // Mental Health
  mentalHealth: {
    keywords: ['mental health', 'depression', 'anxiety', 'stress', 'mood'],
    response: "Mental health is as important as physical health. Common strategies include: regular exercise, adequate sleep, social connections, stress management techniques, and seeking professional help when needed. Warning signs requiring attention include persistent sadness, anxiety, mood changes, or thoughts of self-harm. Don't hesitate to reach out to mental health professionals."
  },

  // General Symptoms
  symptoms: {
    keywords: ['fever', 'headache', 'pain', 'nausea', 'dizziness', 'cough'],
    response: "For common symptoms: fever - rest, fluids, monitor temperature; headache - rest, hydration, consider over-the-counter pain relief; persistent cough - stay hydrated, honey may help. Seek immediate care for severe symptoms, high fever (>103°F), difficulty breathing, chest pain, or symptoms that worsen rapidly. This is general guidance only - consult healthcare professionals for proper diagnosis."
  },

  // Emergency
  emergency: {
    keywords: ['emergency', 'urgent', 'severe', 'chest pain', 'difficulty breathing', 'stroke'],
    response: "🚨 MEDICAL EMERGENCY signs include: chest pain, difficulty breathing, severe bleeding, loss of consciousness, signs of stroke (face drooping, arm weakness, speech difficulty), severe allergic reactions. CALL EMERGENCY SERVICES IMMEDIATELY (911) for these symptoms. Don't wait or try to drive yourself - get professional emergency medical care right away."
  }
};

// Intelligent Health Response System
const getIntelligentHealthResponse = (userMessage) => {
  const message = userMessage.toLowerCase();

  // Check for emergency keywords first
  for (const [key, data] of Object.entries(healthKnowledgeBase)) {
    if (key === 'emergency' && data.keywords.some(keyword => message.includes(keyword))) {
      return { response: data.response, source: 'emergency', priority: 'high' };
    }
  }

  // Find best matching health topic
  let bestMatch = null;
  let maxMatches = 0;

  for (const [key, data] of Object.entries(healthKnowledgeBase)) {
    const matches = data.keywords.filter(keyword => message.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = { key, data };
    }
  }

  if (bestMatch && maxMatches > 0) {
    return {
      response: bestMatch.data.response,
      source: 'knowledge_base',
      topic: bestMatch.key,
      confidence: maxMatches
    };
  }

  // Generic helpful response for unmatched queries
  return {
    response: "I understand you have a health question. While I can provide general health information, I recommend consulting with a healthcare professional for personalized medical advice. You can book a telemedicine consultation through our platform, or visit our symptom checker for preliminary guidance. Is there a specific health topic you'd like to know more about?",
    source: 'fallback',
    confidence: 0
  };
};

// Enhanced OpenAI API call function
const callOpenAI = async (messages, maxTokens = 300, temperature = 0.7) => {
  const requestFn = async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE'}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: maxTokens,
        temperature
      })
    });

    if (!response.ok) {
      const error = new Error(`API request failed: ${response.status}`);
      error.status = response.status;

      if (response.status === 429) {
        error.message = 'Rate limit exceeded. Please wait a moment before trying again.';
      } else if (response.status === 401) {
        error.message = 'API authentication failed. Please check your API key.';
      } else if (response.status >= 500) {
        error.message = 'OpenAI service is temporarily unavailable. Please try again later.';
      }

      throw error;
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  return await apiLimiter.makeRequest(requestFn);
};

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
const GEMINI_MODEL = 'gemini-1.5-flash-latest';

// Gemini API call function
const callGemini = async (messages, maxTokens = 300, temperature = 0.7) => {
  const requestFn = async () => {
    // Combine system and user messages into one prompt for Gemini
    const promptText = messages
      .map((m) => {
        const role = m.role || 'user';
        return `${role.toUpperCase()}:\n${m.content}`;
      })
      .join('\n\n');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens
        }
      })
    });

    if (!response.ok) {
      const error = new Error(`Gemini API error: ${response.status}`);
      error.status = response.status;
      if (response.status === 401) {
        error.message = 'API authentication failed. Please check your API key.';
      } else if (response.status >= 500) {
        error.message = 'Gemini service is temporarily unavailable. Please try again later.';
      }
      throw error;
    }

    const data = await response.json();
    const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts)
      ? data.candidates[0].content.parts.map((p) => p.text || '').join('\n').trim()
      : '';
    if (!text) {
      throw new Error('Empty response from Gemini');
    }
    return text;
  };

  return apiLimiter.makeRequest(requestFn);
};

// Modal Component
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

// Symptom Checker Component
const SymptomChecker = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [symptoms, setSymptoms] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const questions = [
    {
      id: 'main_symptom',
      question: 'What is your main symptom?',
      type: 'select',
      options: ['Fever', 'Headache', 'Cough', 'Chest Pain', 'Stomach Pain', 'Fatigue', 'Dizziness']
    },
    {
      id: 'duration',
      question: 'How long have you experienced this symptom?',
      type: 'select',
      options: ['Less than 1 day', '1-3 days', '4-7 days', '1-2 weeks', 'More than 2 weeks']
    },
    {
      id: 'severity',
      question: 'How would you rate the severity? (1-10)',
      type: 'range',
      min: 1,
      max: 10
    },
    {
      id: 'additional',
      question: 'Any additional symptoms?',
      type: 'checkbox',
      options: ['Nausea', 'Vomiting', 'Runny nose', 'Sore throat', 'Body aches', 'Loss of appetite']
    }
  ];

  const getRecommendation = async () => {
    const mainSymptom = answers.main_symptom;
    const duration = answers.duration;
    const severity = parseInt(answers.severity) || 5;
    const additionalSymptoms = answers.additional || [];

    // Enhanced symptom-based analysis with immediate fallback
    const getSymptomRecommendation = () => {
      // Emergency symptoms requiring immediate attention
      const emergencySymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'loss of consciousness'];
      const emergencyKeywords = ['severe', 'extreme', 'unbearable', 'emergency'];

      const isEmergency = severity >= 9 ||
                         emergencySymptoms.some(s => mainSymptom.toLowerCase().includes(s)) ||
                         emergencyKeywords.some(k => additionalSymptoms.some(symptom => symptom.toLowerCase().includes(k)));

      if (isEmergency || severity >= 8) {
        return {
          urgency: 'HIGH',
          recommendation: 'Seek immediate medical attention due to severe symptoms',
          color: '#e53e3e',
          icon: 'fas fa-exclamation-triangle',
          actions: [
            'Call emergency services (911) or go to emergency room immediately',
            'Do not drive yourself - have someone drive you or call ambulance',
            'Bring list of current medications and medical history'
          ]
        };
      } else if (severity >= 5) {
        return {
          urgency: 'MEDIUM',
          recommendation: 'Schedule a doctor consultation within 24-48 hours for proper evaluation',
          color: '#dd6b20',
          icon: 'fas fa-user-md',
          actions: [
            'Book telemedicine appointment or visit urgent care',
            'Monitor symptoms and track any changes',
            'Rest, stay hydrated, and avoid strenuous activities'
          ]
        };
      } else {
        return {
          urgency: 'LOW',
          recommendation: 'Monitor symptoms and try home remedies, contact doctor if symptoms worsen',
          color: '#38a169',
          icon: 'fas fa-home',
          actions: [
            'Rest and stay well hydrated',
            'Consider appropriate over-the-counter medications',
            'Contact doctor if symptoms persist beyond 3-5 days or worsen'
          ]
        };
      }
    };

    // Try AI analysis but immediately fall back to rule-based on any error
    try {
      const symptomDescription = `
Main symptom: ${mainSymptom}
Duration: ${duration}
Severity (1-10): ${severity}
Additional symptoms: ${additionalSymptoms.join(', ') || 'None'}
    `.trim();

      const messages = [
        {
          role: 'system',
          content: 'You are a medical triage AI assistant. Based on symptoms provided, categorize urgency as HIGH, MEDIUM, or LOW, provide a recommendation, and suggest 3 specific actions. Format your response as JSON with fields: urgency, recommendation, actions (array of 3 strings). HIGH urgency for severe/emergency symptoms (severity 8+), MEDIUM for moderate concern (severity 5-7), LOW for mild symptoms. Always emphasize consulting healthcare professionals for proper diagnosis.'
        },
        {
          role: 'user',
          content: `Analyze these symptoms and provide triage recommendation: ${symptomDescription}`
        }
      ];

      const responseText = await callGemini(messages, 400, 0.3);
      const aiResult = JSON.parse(responseText);

      // Map urgency to colors and icons
      const urgencyMap = {
        'HIGH': { color: '#e53e3e', icon: 'fas fa-exclamation-triangle' },
        'MEDIUM': { color: '#dd6b20', icon: 'fas fa-user-md' },
        'LOW': { color: '#38a169', icon: 'fas fa-home' }
      };

      const urgencyInfo = urgencyMap[aiResult.urgency] || urgencyMap['MEDIUM'];

      return {
        urgency: aiResult.urgency,
        recommendation: aiResult.recommendation,
        actions: aiResult.actions,
        color: urgencyInfo.color,
        icon: urgencyInfo.icon
      };
    } catch (error) {
      console.error('AI symptom analysis error - using enhanced fallback:', error);

      // Use enhanced rule-based analysis as fallback
      return getSymptomRecommendation();
    }

    // This code after the catch block is now unreachable, but keeping for safety
    function unusedFallbackCode() {
      // Legacy fallback code
      if (severity >= 8) {
        return {
          urgency: 'HIGH',
          recommendation: 'Seek immediate medical attention due to high symptom severity',
          color: '#e53e3e',
          icon: 'fas fa-exclamation-triangle',
          actions: ['Visit emergency room or urgent care', 'Call emergency services if symptoms worsen', 'Contact your doctor immediately']
        };
      } else if (severity >= 5) {
        return {
          urgency: 'MEDIUM',
          recommendation: 'Schedule a doctor consultation within 24-48 hours',
          color: '#dd6b20',
          icon: 'fas fa-user-md',
          actions: ['Book telemedicine appointment', 'Monitor symptoms closely', 'Rest and stay hydrated']
        };
      } else {
        return {
          urgency: 'LOW',
          recommendation: 'Monitor symptoms and try home remedies',
          color: '#38a169',
          icon: 'fas fa-home',
          actions: ['Rest and stay hydrated', 'Use appropriate over-the-counter medication', 'Contact doctor if symptoms worsen or persist']
        };
      }
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextStep = async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsAnalyzing(true);

      setTimeout(async () => {
        try {
          const result = await getRecommendation();
          setAnalysisResult(result);
        } catch (error) {
          console.error('Analysis failed:', error);
          setAnalysisResult({
            urgency: 'MEDIUM',
            recommendation: 'Based on your symptoms, we recommend consulting a healthcare professional for proper evaluation.',
            color: '#dd6b20',
            icon: 'fas fa-user-md',
            actions: [
              'Contact your primary care doctor or urgent care',
              'Book a telemedicine consultation through our platform',
              'Monitor symptoms and seek immediate care if they worsen'
            ]
          });
        } finally {
          setIsAnalyzing(false);
          setShowResults(true);
        }
      }, 2000);
    }
  };

  const resetChecker = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResults(false);
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  if (isAnalyzing) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Analyzing Your Symptoms">
        <div className="symptom-analysis-loading">
          <div className="loading-spinner">
            <i className="fas fa-brain"></i>
          </div>
          <h3>AI Health Analysis in Progress</h3>
          <p>Our AI is carefully analyzing your symptoms to provide personalized recommendations...</p>
          <div className="analysis-steps">
            <div className="step active">
              <i className="fas fa-check"></i>
              <span>Processing symptoms</span>
            </div>
            <div className="step active">
              <i className="fas fa-brain"></i>
              <span>AI analysis</span>
            </div>
            <div className="step active">
              <i className="fas fa-clipboard-list"></i>
              <span>Generating recommendations</span>
            </div>
          </div>
          <div className="ai-disclaimer">
            <p><i className="fas fa-info-circle"></i> Powered by advanced AI technology for preliminary health guidance</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (showResults && analysisResult) {
    const result = analysisResult;
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Symptom Analysis Results">
        <div className="symptom-results">
          <div className="result-header" style={{ borderColor: result.color }}>
            <i className={result.icon} style={{ color: result.color }}></i>
            <h3 style={{ color: result.color }}>Urgency: {result.urgency}</h3>
          </div>
          <div className="result-recommendation">
            <h4>Recommendation:</h4>
            <p>{result.recommendation}</p>
          </div>
          <div className="result-actions">
            <h4>Suggested Actions:</h4>
            <ul>
              {result.actions.map((action, index) => (
                <li key={index}><i className="fas fa-check"></i> {action}</li>
              ))}
            </ul>
          </div>
          <div className="result-buttons">
            <button className="btn-primary" onClick={resetChecker}>Check Another Symptom</button>
            <button className="btn-outline">Book Consultation</button>
          </div>
          <div className="analysis-method">
            <p><i className="fas fa-cogs"></i> Analysis powered by advanced health algorithms and medical guidelines</p>
          </div>
          <div className="disclaimer">
            <p><i className="fas fa-info-circle"></i> This is not a medical diagnosis. Please consult a healthcare professional for proper medical advice.</p>
          </div>
        </div>
      </Modal>
    );
  }

  const currentQuestion = questions[currentStep];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Symptom Checker">
      <div className="symptom-checker">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}></div>
        </div>
        <div className="question-section">
          <h4>Question {currentStep + 1} of {questions.length}</h4>
          <p className="question-text">{currentQuestion.question}</p>
          
          {currentQuestion.type === 'select' && (
            <div className="select-options">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-btn ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          
          {currentQuestion.type === 'range' && (
            <div className="range-input">
              <input
                type="range"
                min={currentQuestion.min}
                max={currentQuestion.max}
                value={answers[currentQuestion.id] || 5}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              />
              <div className="range-labels">
                <span>Mild (1)</span>
                <span className="current-value">{answers[currentQuestion.id] || 5}</span>
                <span>Severe (10)</span>
              </div>
            </div>
          )}
          
          {currentQuestion.type === 'checkbox' && (
            <div className="checkbox-options">
              {currentQuestion.options.map((option, index) => (
                <label key={index} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(answers[currentQuestion.id] || []).includes(option)}
                    onChange={(e) => {
                      const current = answers[currentQuestion.id] || [];
                      if (e.target.checked) {
                        handleAnswer(currentQuestion.id, [...current, option]);
                      } else {
                        handleAnswer(currentQuestion.id, current.filter(item => item !== option));
                      }
                    }}
                  />
                  <span className="checkmark"></span>
                  {option}
                </label>
              ))}
            </div>
          )}
          
          <button 
            className="btn-primary next-btn"
            onClick={nextStep}
            disabled={!answers[currentQuestion.id]}
          >
            {currentStep === questions.length - 1 ? 'Analyze Symptoms' : 'Next Question'}
            <i className={`fas ${currentStep === questions.length - 1 ? 'fa-brain' : 'fa-arrow-right'}`}></i>
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Health Assistant Chatbot
const HealthAssistant = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI Health Assistant with access to comprehensive health information. 📚 I'm currently in Knowledge Base mode for instant, reliable responses. You can toggle to AI mode above if you prefer AI-powered responses (may have delays). How can I help you today?", sender: 'bot', time: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [useAIMode, setUseAIMode] = useState(false); // Default to knowledge base for reliability

  const quickQuestions = [
    "What are the symptoms of COVID-19?",
    "How to reduce blood pressure naturally?",
    "What foods are good for heart health?",
    "How much water should I drink daily?",
    "What are signs of diabetes?"
  ];

  const getAIResponse = async (userMessage) => {
    // First, try to get intelligent response from knowledge base
    const intelligentResponse = getIntelligentHealthResponse(userMessage);

    // For emergency situations, return immediately
    if (intelligentResponse.priority === 'high') {
      return intelligentResponse.response;
    }

    // If user prefers knowledge base mode, use it directly
    if (!useAIMode) {
      return intelligentResponse.response + "\n\n📚 Response from our comprehensive health knowledge base. For personalized medical advice, please consult a healthcare professional.";
    }

    // For high-confidence knowledge base matches in AI mode, still use them to avoid unnecessary API calls
    if (intelligentResponse.confidence >= 1) {
      return intelligentResponse.response + "\n\n💡 This response is from our health knowledge base. For personalized advice, please consult a healthcare professional.";
    }

    // AI Mode: Try OpenAI API but fall back immediately on any error
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful AI health assistant for HealthGuard AI. Provide accurate, helpful health information while always emphasizing that your advice is for informational purposes only and users should consult healthcare professionals for medical diagnosis and treatment. Keep responses concise, practical, and focused on general health guidance. Always be empathetic and supportive.'
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      const aiResponse = await callGemini(messages, 300, 0.7);
              return aiResponse + "\n\n🤖 AI-powered response (Gemini). For medical emergencies, call emergency services immediately.";
    } catch (error) {
              console.error('Gemini API Error - falling back to knowledge base:', error);

      // Set rate limited state to inform user
      setIsRateLimited(true);
      setTimeout(() => setIsRateLimited(false), 10000);

      // Always fall back to intelligent response on any API error
      return intelligentResponse.response + "\n\n📚 Switched to knowledge base due to AI rate limits. Response is still accurate and helpful!";
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      time: new Date()
    };

    const messageToSend = inputText;
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setIsRateLimited(false);

    try {
      const aiResponse = await getAIResponse(messageToSend);

      if (aiResponse.includes('high demand') || aiResponse.includes('wait a moment')) {
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 10000);
      }

      const botResponse = {
        id: messages.length + 2,
        text: aiResponse,
        sender: 'bot',
        time: new Date(),
        isRateLimited: aiResponse.includes('high demand')
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      let errorMessage = "I'm experiencing technical difficulties. Please try again later or contact our support team for assistance.";

      if (error.status === 429) {
        errorMessage = "I'm currently experiencing high demand. Please wait a moment before sending another message.";
        setIsRateLimited(true);
        setTimeout(() => setIsRateLimited(false), 15000);
      }

      const errorResponse = {
        id: messages.length + 2,
        text: errorMessage,
        sender: 'bot',
        time: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="24/7 Health Assistant">
      <div className="health-assistant">
        <div className="assistant-controls">
          <div className="mode-selector">
            <label className="mode-toggle">
              <input
                type="checkbox"
                checked={useAIMode}
                onChange={(e) => setUseAIMode(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="mode-label">
                {useAIMode ? (
                  <><i className="fas fa-robot"></i> AI Mode (may have delays)</>
                ) : (
                  <><i className="fas fa-book-medical"></i> Knowledge Base (instant)</>
                )}
              </span>
            </label>
          </div>
        </div>

        {isRateLimited && (
          <div className="rate-limit-warning">
            <i className="fas fa-clock"></i>
            <span>High demand detected. Using knowledge base for instant responses.</span>
          </div>
        )}

        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.sender} ${message.isError ? 'error' : ''} ${message.isRateLimited ? 'rate-limited' : ''}`}>
              <div className="message-content">
                <p>{message.text}</p>
                <span className="message-time">
                  {message.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.isRateLimited && (
                  <span className="rate-limit-indicator">
                    <i className="fas fa-exclamation-triangle"></i>
                    Rate limited
                  </span>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message bot typing">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="quick-questions">
          <p>Quick questions:</p>
          <div className="quick-buttons">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="quick-btn"
                onClick={() => handleQuickQuestion(question)}
                disabled={isRateLimited}
              >
                {question}
              </button>
            ))}
          </div>
          {isRateLimited && (
            <div className="ai-usage-info">
              <i className="fas fa-info-circle"></i>
              <span>AI responses are rate-limited to ensure quality service for all users.</span>
            </div>
          )}
        </div>
        
        <div className="chat-input">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRateLimited ? "Please wait before sending another message..." : "Ask me anything about your health..."}
            onKeyPress={(e) => e.key === 'Enter' && !isRateLimited && sendMessage()}
            disabled={isRateLimited}
          />
          <button
            className={`send-btn ${isRateLimited ? 'disabled' : ''}`}
            onClick={sendMessage}
            disabled={isRateLimited}
          >
            <i className={`fas ${isRateLimited ? 'fa-clock' : 'fa-paper-plane'}`}></i>
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Health Dashboard
const HealthDashboard = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const healthData = {
    vitals: {
      heartRate: 72,
      bloodPressure: '120/80',
      temperature: 98.6,
      weight: 70,
      bmi: 22.5
    },
    appointments: [
      { date: '2024-09-15', doctor: 'Dr. Priya Sharma', type: 'General Checkup', time: '10:00 AM' },
      { date: '2024-09-20', doctor: 'Dr. Amit Kumar', type: 'Cardiology', time: '2:30 PM' },
      { date: '2024-09-25', doctor: 'Dr. Rajesh Gupta', type: 'Dentist', time: '11:00 AM' }
    ],
    medications: [
      { name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Daily', time: '9:00 AM' },
      { name: 'Omega-3', dosage: '500mg', frequency: 'Daily', time: '9:00 AM' },
      { name: 'Multivitamin', dosage: '1 tablet', frequency: 'Daily', time: '9:00 AM' }
    ],
    recentTests: [
      { test: 'Blood Sugar', result: '95 mg/dL', status: 'Normal', date: '2024-08-20' },
      { test: 'Cholesterol', result: '180 mg/dL', status: 'Good', date: '2024-08-15' },
      { test: 'Hemoglobin', result: '13.5 g/dL', status: 'Normal', date: '2024-08-10' }
    ]
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-chart-line' },
    { id: 'appointments', label: 'Appointments', icon: 'fas fa-calendar-alt' },
    { id: 'medications', label: 'Medications', icon: 'fas fa-pills' },
    { id: 'tests', label: 'Test Results', icon: 'fas fa-flask' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personal Health Dashboard">
      <div className="health-dashboard">
        <div className="dashboard-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="vitals-grid">
                <div className="vital-card">
                  <i className="fas fa-heartbeat"></i>
                  <div>
                    <h4>Heart Rate</h4>
                    <p>{healthData.vitals.heartRate} BPM</p>
                    <span className="status good">Normal</span>
                  </div>
                </div>
                <div className="vital-card">
                  <i className="fas fa-tint"></i>
                  <div>
                    <h4>Blood Pressure</h4>
                    <p>{healthData.vitals.bloodPressure}</p>
                    <span className="status good">Optimal</span>
                  </div>
                </div>
                <div className="vital-card">
                  <i className="fas fa-thermometer-half"></i>
                  <div>
                    <h4>Temperature</h4>
                    <p>{healthData.vitals.temperature}°F</p>
                    <span className="status good">Normal</span>
                  </div>
                </div>
                <div className="vital-card">
                  <i className="fas fa-weight"></i>
                  <div>
                    <h4>BMI</h4>
                    <p>{healthData.vitals.bmi}</p>
                    <span className="status good">Healthy</span>
                  </div>
                </div>
              </div>
              
              <div className="health-score">
                <h3>Overall Health Score</h3>
                <div className="score-circle">
                  <div className="score-value">85</div>
                  <div className="score-label">Good</div>
                </div>
                <p>Your health metrics are within normal ranges. Keep up the good work!</p>
              </div>
            </div>
          )}
          
          {activeTab === 'appointments' && (
            <div className="appointments-tab">
              <div className="tab-header">
                <h3>Upcoming Appointments</h3>
                <button className="btn-primary">Book New Appointment</button>
              </div>
              <div className="appointments-list">
                {healthData.appointments.map((appointment, index) => (
                  <div key={index} className="appointment-card">
                    <div className="appointment-date">
                      <span className="date">{new Date(appointment.date).getDate()}</span>
                      <span className="month">{new Date(appointment.date).toLocaleDateString('en', { month: 'short' })}</span>
                    </div>
                    <div className="appointment-details">
                      <h4>{appointment.type}</h4>
                      <p>{appointment.doctor}</p>
                      <span className="time">{appointment.time}</span>
                    </div>
                    <div className="appointment-actions">
                      <button className="btn-outline small">Reschedule</button>
                      <button className="btn-primary small">Join Video Call</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'medications' && (
            <div className="medications-tab">
              <div className="tab-header">
                <h3>Current Medications</h3>
                <button className="btn-primary">Add Medication</button>
              </div>
              <div className="medications-list">
                {healthData.medications.map((medication, index) => (
                  <div key={index} className="medication-card">
                    <div className="medication-icon">
                      <i className="fas fa-pills"></i>
                    </div>
                    <div className="medication-details">
                      <h4>{medication.name}</h4>
                      <p>{medication.dosage} - {medication.frequency}</p>
                      <span className="reminder-time">Next dose: {medication.time}</span>
                    </div>
                    <div className="medication-actions">
                      <button className="btn-outline small">Edit</button>
                      <button className="reminder-btn">
                        <i className="fas fa-bell"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'tests' && (
            <div className="tests-tab">
              <div className="tab-header">
                <h3>Recent Test Results</h3>
                <button className="btn-primary">Upload New Results</button>
              </div>
              <div className="tests-list">
                {healthData.recentTests.map((test, index) => (
                  <div key={index} className="test-card">
                    <div className="test-details">
                      <h4>{test.test}</h4>
                      <p className="test-result">{test.result}</p>
                      <span className="test-date">{test.date}</span>
                    </div>
                    <div className={`test-status ${test.status.toLowerCase()}`}>
                      {test.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Telemedicine Booking
const TelemedicineBooking = ({ isOpen, onClose }) => {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [step, setStep] = useState(1);

  const doctors = [
    { 
      id: 1, 
      name: 'Dr. Priya Sharma', 
      specialty: 'General Medicine', 
      experience: '15 years', 
      rating: 4.9, 
      fee: 500,
      avatar: '👩‍⚕️',
      languages: ['Hindi', 'English'],
      nextAvailable: '2024-09-15'
    },
    { 
      id: 2, 
      name: 'Dr. Amit Kumar', 
      specialty: 'Cardiology', 
      experience: '20 years', 
      rating: 4.8, 
      fee: 800,
      avatar: '👨‍⚕️',
      languages: ['Hindi', 'English', 'Bengali'],
      nextAvailable: '2024-09-16'
    },
    { 
      id: 3, 
      name: 'Dr. Rajesh Gupta', 
      specialty: 'Dermatology', 
      experience: '12 years', 
      rating: 4.7, 
      fee: 600,
      avatar: '👨‍⚕️',
      languages: ['Hindi', 'English'],
      nextAvailable: '2024-09-15'
    }
  ];

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'
  ];

  const handleBooking = () => {
    alert(`Appointment booked successfully with ${selectedDoctor.name} on ${selectedDate} at ${selectedTime}. You will receive a confirmation email shortly.`);
    onClose();
    setStep(1);
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedTime('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Telemedicine Consultation">
      <div className="telemedicine-booking">
        <div className="booking-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span> Choose Doctor
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span> Select Date & Time
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span>3</span> Confirm Booking
          </div>
        </div>

        {step === 1 && (
          <div className="doctor-selection">
            <h3>Select a Doctor</h3>
            <div className="doctors-list">
              {doctors.map((doctor) => (
                <div 
                  key={doctor.id} 
                  className={`doctor-card ${selectedDoctor?.id === doctor.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDoctor(doctor)}
                >
                  <div className="doctor-avatar">{doctor.avatar}</div>
                  <div className="doctor-info">
                    <h4>{doctor.name}</h4>
                    <p className="specialty">{doctor.specialty}</p>
                    <div className="doctor-details">
                      <span><i className="fas fa-star"></i> {doctor.rating}</span>
                      <span><i className="fas fa-user-md"></i> {doctor.experience}</span>
                      <span><i className="fas fa-language"></i> {doctor.languages.join(', ')}</span>
                    </div>
                    <div className="doctor-fee">₹{doctor.fee} consultation fee</div>
                    <div className="next-available">Next available: {doctor.nextAvailable}</div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              className="btn-primary continue-btn"
              disabled={!selectedDoctor}
              onClick={() => setStep(2)}
            >
              Continue <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="datetime-selection">
            <h3>Select Date & Time</h3>
            <div className="selected-doctor-info">
              <span>{selectedDoctor.avatar}</span>
              <div>
                <h4>{selectedDoctor.name}</h4>
                <p>{selectedDoctor.specialty}</p>
              </div>
            </div>
            
            <div className="date-selection">
              <h4>Choose Date</h4>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            {selectedDate && (
              <div className="time-selection">
                <h4>Available Time Slots</h4>
                <div className="time-slots">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="navigation-buttons">
              <button className="btn-outline" onClick={() => setStep(1)}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <button 
                className="btn-primary"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(3)}
              >
                Continue <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="booking-confirmation">
            <h3>Confirm Your Booking</h3>
            <div className="booking-summary">
              <div className="summary-card">
                <h4>Appointment Details</h4>
                <div className="detail-row">
                  <span>Doctor:</span>
                  <span>{selectedDoctor.name}</span>
                </div>
                <div className="detail-row">
                  <span>Specialty:</span>
                  <span>{selectedDoctor.specialty}</span>
                </div>
                <div className="detail-row">
                  <span>Date:</span>
                  <span>{new Date(selectedDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span>Time:</span>
                  <span>{selectedTime}</span>
                </div>
                <div className="detail-row total">
                  <span>Consultation Fee:</span>
                  <span>₹{selectedDoctor.fee}</span>
                </div>
              </div>
              
              <div className="consultation-info">
                <h4>What to Expect</h4>
                <ul>
                  <li><i className="fas fa-video"></i> High-quality video consultation</li>
                  <li><i className="fas fa-prescription"></i> Digital prescription if needed</li>
                  <li><i className="fas fa-file-medical"></i> Medical records integration</li>
                  <li><i className="fas fa-clock"></i> 30-minute consultation time</li>
                </ul>
              </div>
            </div>
            
            <div className="navigation-buttons">
              <button className="btn-outline" onClick={() => setStep(2)}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <button className="btn-primary" onClick={handleBooking}>
                Confirm Booking <i className="fas fa-check"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Community Platform
const CommunityPlatform = ({ isOpen, onClose }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  const communityGroups = [
    {
      id: 1,
      name: 'Diabetes Support',
      members: 15200,
      icon: 'fas fa-heartbeat',
      description: 'Managing diabetes together with tips, experiences, and support',
      lastActivity: '2 minutes ago',
      messages: [
        { id: 1, user: 'Rajesh Kumar', message: 'Just started using insulin pump. Any tips for beginners?', time: '10:30 AM', likes: 5 },
        { id: 2, user: 'Dr. Priya Sharma', message: 'Great question! Start with small increments and monitor closely. Happy to help with any specific concerns.', time: '10:45 AM', likes: 12, isExpert: true },
        { id: 3, user: 'Anita Patel', message: 'I have been using pump for 2 years. The key is consistent monitoring and proper training.', time: '11:00 AM', likes: 8 }
      ]
    },
    {
      id: 2,
      name: 'Mental Wellness',
      members: 8700,
      icon: 'fas fa-brain',
      description: 'Mental health support and mindfulness practices',
      lastActivity: '5 minutes ago',
      messages: [
        { id: 1, user: 'Suresh Singh', message: 'Started meditation 30 days ago. Feeling much better with anxiety levels.', time: '9:15 AM', likes: 15 },
        { id: 2, user: 'Maya Joshi', message: 'That is wonderful! Which app or technique are you using?', time: '9:30 AM', likes: 3 },
        { id: 3, user: 'Dr. Amit Shah', message: 'Consistency is key with meditation. Even 10 minutes daily can make significant difference.', time: '9:45 AM', likes: 20, isExpert: true }
      ]
    },
    {
      id: 3,
      name: 'Heart Health',
      members: 12100,
      icon: 'fas fa-heart',
      description: 'Cardiovascular health tips and lifestyle guidance',
      lastActivity: '15 minutes ago',
      messages: [
        { id: 1, user: 'Vikram Reddy', message: 'Completed my first 5K run post-surgery! Never felt better.', time: '8:00 AM', likes: 25 },
        { id: 2, user: 'Sunita Gupta', message: 'Congratulations! That is inspiring. How long was your recovery?', time: '8:15 AM', likes: 5 },
        { id: 3, user: 'Dr. Kavitha Rao', message: 'Excellent progress! Gradual increase in activity is exactly what we recommend.', time: '8:30 AM', likes: 18, isExpert: true }
      ]
    }
  ];

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedGroup) return;
    
    const message = {
      id: selectedGroup.messages.length + 1,
      user: 'You',
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 0
    };
    
    selectedGroup.messages.push(message);
    setNewMessage('');
  };

  if (selectedGroup) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={selectedGroup.name}>
        <div className="community-chat">
          <div className="chat-header">
            <button className="back-btn" onClick={() => setSelectedGroup(null)}>
              <i className="fas fa-arrow-left"></i> Back to Groups
            </button>
            <div className="group-info">
              <h3>{selectedGroup.name}</h3>
              <p>{selectedGroup.members.toLocaleString()} members • {selectedGroup.lastActivity}</p>
            </div>
          </div>
          
          <div className="chat-messages-community">
            {selectedGroup.messages.map((message) => (
              <div key={message.id} className="community-message">
                <div className="message-header">
                  <span className={`username ${message.isExpert ? 'expert' : ''}`}>
                    {message.user}
                    {message.isExpert && <i className="fas fa-check-circle"></i>}
                  </span>
                  <span className="message-time">{message.time}</span>
                </div>
                <p className="message-text">{message.message}</p>
                <div className="message-actions">
                  <button className="like-btn">
                    <i className="fas fa-heart"></i> {message.likes}
                  </button>
                  <button className="reply-btn">
                    <i className="fas fa-reply"></i> Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="chat-input-community">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Share your thoughts with the community..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button className="send-btn" onClick={sendMessage}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Health Community Groups">
      <div className="community-platform">
        <div className="community-header">
          <h3>Join Support Groups</h3>
          <p>Connect with others on similar health journeys</p>
        </div>
        
        <div className="community-groups-list">
          {communityGroups.map((group) => (
            <div key={group.id} className="community-group-card">
              <div className="group-icon">
                <i className={group.icon}></i>
              </div>
              <div className="group-details">
                <h4>{group.name}</h4>
                <p>{group.description}</p>
                <div className="group-stats">
                  <span><i className="fas fa-users"></i> {group.members.toLocaleString()} members</span>
                  <span><i className="fas fa-clock"></i> {group.lastActivity}</span>
                </div>
              </div>
              <div className="group-actions">
                <button 
                  className="btn-primary"
                  onClick={() => setSelectedGroup(group)}
                >
                  Join Discussion
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="community-benefits">
          <h4>Community Benefits</h4>
          <div className="benefits-grid">
            <div className="benefit-item">
              <i className="fas fa-heart"></i>
              <span>Emotional Support</span>
            </div>
            <div className="benefit-item">
              <i className="fas fa-lightbulb"></i>
              <span>Practical Tips</span>
            </div>
            <div className="benefit-item">
              <i className="fas fa-user-md"></i>
              <span>Expert Guidance</span>
            </div>
            <div className="benefit-item">
              <i className="fas fa-users"></i>
              <span>Peer Connection</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Auth Modal Component
const AuthModal = ({ isOpen, onClose, onAuthenticated }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const { token, user } = mode === 'signup'
        ? await apiRegister(name.trim(), email.trim(), password)
        : await apiLogin(email.trim(), password);
      authStorage.setToken(token);
      onAuthenticated(user);
      onClose();
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <button className="auth-close" onClick={onClose}>×</button>
        <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        
        <div className="auth-toggle">
          <button 
            className={mode === 'login' ? 'active' : ''} 
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button 
            className={mode === 'signup' ? 'active' : ''} 
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>
        
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {mode === 'signup' && (
            <>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Your full name" 
                required
              />
            </>
          )}
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="you@example.com" 
            required
          />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="6+ characters" 
            required
          />
          
          {error && <div className="auth-error">{error}</div>}
          
          <button 
            type="submit"
            disabled={loading || !email || password.length < 6 || (mode === 'signup' && name.trim().length < 2)}
          >
            {loading ? 'Please wait...' : (mode === 'signup' ? 'Create Account' : 'Login')}
          </button>
        </form>
      </div>
    </div>
  );
};

// Header Component with Interactive Features
const Header = ({ onAuthed, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) return;
    apiMe(token).then(({ user }) => setCurrentUser(user)).catch(() => authStorage.clear());
  }, []);

  const openModal = (modalType) => {
    setActiveModal(modalType);
    setIsMenuOpen(false);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon">
              <i className="fas fa-user-md"></i>
            </div>
            <div className="logo-text">
              <span className="logo-main">HealthGuard</span>
              <span className="logo-sub">AI</span>
            </div>
          </div>
          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#telemedicine">Telemedicine</a>
            <a href="#community">Community</a>
          </nav>
          <div className="header-actions">
            {currentUser ? (
              <>
                <button className="btn-secondary" onClick={() => openModal('dashboard')}>Dashboard</button>
                <button className="btn-primary" onClick={() => openModal('assistant')}>AI Assistant</button>
                <span className="user-pill"><i className="fas fa-user"></i> {currentUser.name || currentUser.email}</span>
                <button className="btn-outline" onClick={() => { authStorage.clear(); setCurrentUser(null); if (onAuthed) onAuthed(false); if (onLogout) onLogout(); }}>Logout</button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={() => openModal('auth')}>Login / Sign Up</button>
              </>
            )}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Interactive Modals */}
      <SymptomChecker isOpen={activeModal === 'symptom'} onClose={closeModal} />
      <HealthAssistant isOpen={activeModal === 'assistant'} onClose={closeModal} />
      <AuthModal isOpen={activeModal === 'auth'} onClose={closeModal} onAuthenticated={(u) => { setCurrentUser(u); if (onAuthed) onAuthed(true); }} />
      <HealthDashboard isOpen={activeModal === 'dashboard'} onClose={closeModal} />
      <TelemedicineBooking isOpen={activeModal === 'telemedicine'} onClose={closeModal} />
      <CommunityPlatform isOpen={activeModal === 'community'} onClose={closeModal} />
    </>
  );
};

// Updated Hero Section with Interactive CTAs
const Hero = () => {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <i className="fas fa-sparkles"></i>
              <span>AI-Powered Healthcare for India</span>
            </div>
            <h1 className="hero-title">
              Your Intelligent <span className="gradient-text">Health Companion</span>
            </h1>
            <p className="hero-description">
              HealthGuard AI proactively monitors your wellness, predicts health risks, 
              and provides personalized, localized advice and reminders—making quality 
              healthcare accessible to every Indian.
            </p>
            <div className="hero-actions">
              <button className="btn-primary large" onClick={() => setActiveModal('symptom')}>
                <i className="fas fa-search-plus"></i>
                Check Symptoms Now
              </button>
              <button className="btn-outline large" onClick={() => setActiveModal('assistant')}>
                <i className="fas fa-robot"></i>
                Talk to AI Assistant
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">500K+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat">
                <span className="stat-number">1M+</span>
                <span className="stat-label">Health Checks</span>
              </div>
              <div className="stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">AI Support</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card main-card">
              <div className="card-header">
                <i className="fas fa-user-md"></i>
                <span>AI Health Assistant</span>
              </div>
              <div className="card-content">
                <div className="health-metric">
                  <span className="metric-label">Heart Rate</span>
                  <span className="metric-value good">72 BPM</span>
                </div>
                <div className="health-metric">
                  <span className="metric-label">Blood Pressure</span>
                  <span className="metric-value normal">120/80</span>
                </div>
                <div className="health-metric">
                  <span className="metric-label">Next Checkup</span>
                  <span className="metric-value">In 7 days</span>
                </div>
              </div>
            </div>
            <div className="floating-cards">
              <div className="floating-card symptom-checker" onClick={() => setActiveModal('symptom')}>
                <i className="fas fa-stethoscope"></i>
                <span>Symptom Checker</span>
              </div>
              <div className="floating-card telemedicine" onClick={() => setActiveModal('telemedicine')}>
                <i className="fas fa-video"></i>
                <span>Video Consultation</span>
              </div>
              <div className="floating-card community" onClick={() => setActiveModal('community')}>
                <i className="fas fa-users"></i>
                <span>Support Groups</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      <SymptomChecker isOpen={activeModal === 'symptom'} onClose={() => setActiveModal(null)} />
      <HealthAssistant isOpen={activeModal === 'assistant'} onClose={() => setActiveModal(null)} />
      <HealthDashboard isOpen={activeModal === 'dashboard'} onClose={() => setActiveModal(null)} />
      <TelemedicineBooking isOpen={activeModal === 'telemedicine'} onClose={() => setActiveModal(null)} />
      <CommunityPlatform isOpen={activeModal === 'community'} onClose={() => setActiveModal(null)} />
    </>
  );
};

// Updated Features Section with Interactive Buttons
const Features = () => {
  const [activeModal, setActiveModal] = useState(null);
  
  const features = [
    {
      icon: "fas fa-search-plus",
      title: "Smart Symptom Checker",
      description: "Advanced AI-powered symptom analysis that helps you understand your health concerns and provides accurate recommendations based on millions of medical cases.",
      benefits: ["Instant health assessment", "Personalized recommendations", "Risk prediction", "Multilingual support"],
      modalType: "symptom"
    },
    {
      icon: "fas fa-robot",
      title: "24/7 Virtual Health Assistant",
      description: "Your personal AI health companion that provides round-the-clock guidance, answers health questions, and connects you with appropriate medical services.",
      benefits: ["24/7 availability", "Instant responses", "Medication reminders", "Health tips"],
      modalType: "assistant"
    },
    {
      icon: "fas fa-chart-line",
      title: "Personalized Health Dashboard",
      description: "Comprehensive health tracking dashboard that monitors your vital signs, appointments, medical records, and treatment progress in one unified platform.",
      benefits: ["Health tracking", "Appointment management", "Medical records", "Progress monitoring"],
      modalType: "dashboard"
    },
    {
      icon: "fas fa-video",
      title: "Telemedicine Integration",
      description: "Secure, high-quality video consultations with certified doctors and specialists, making expert medical care accessible from anywhere in India.",
      benefits: ["Secure consultations", "Certified doctors", "Prescription delivery", "Follow-up care"],
      modalType: "telemedicine"
    },
    {
      icon: "fas fa-users",
      title: "Community Support Groups",
      description: "Connect with others facing similar health challenges, share experiences, get support, and learn from a caring community of patients and families.",
      benefits: ["Peer support", "Experience sharing", "Expert guidance", "Mental wellness"],
      modalType: "community"
    }
  ];

  return (
    <>
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Comprehensive Healthcare Features</h2>
            <p className="section-description">
              Everything you need for proactive health management, powered by advanced AI technology
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <i className={feature.icon}></i>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <ul className="feature-benefits">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i}>
                      <i className="fas fa-check"></i>
                      {benefit}
                    </li>
                  ))}
                </ul>
                <button 
                  className="btn-primary feature-cta"
                  onClick={() => setActiveModal(feature.modalType)}
                >
                  Try Now <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modals */}
      <SymptomChecker isOpen={activeModal === 'symptom'} onClose={() => setActiveModal(null)} />
      <HealthAssistant isOpen={activeModal === 'assistant'} onClose={() => setActiveModal(null)} />
      <HealthDashboard isOpen={activeModal === 'dashboard'} onClose={() => setActiveModal(null)} />
      <TelemedicineBooking isOpen={activeModal === 'telemedicine'} onClose={() => setActiveModal(null)} />
      <CommunityPlatform isOpen={activeModal === 'community'} onClose={() => setActiveModal(null)} />
    </>
  );
};

// Keep all existing static components (HowItWorks, Telemedicine, Community, Testimonials, Pricing, Footer)
// I'll include the essential ones here and the rest remain as before

// How It Works Section
const HowItWorks = () => {
  const steps = [
    {
      step: "01",
      title: "Health Assessment",
      description: "Complete a comprehensive health profile including medical history, current symptoms, and lifestyle factors.",
      icon: "fas fa-clipboard-list"
    },
    {
      step: "02", 
      title: "AI Analysis",
      description: "Our advanced AI analyzes your data using machine learning algorithms trained on millions of medical cases.",
      icon: "fas fa-brain"
    },
    {
      step: "03",
      title: "Personalized Insights",
      description: "Receive customized health recommendations, risk assessments, and personalized care plans.",
      icon: "fas fa-lightbulb"
    },
    {
      step: "04",
      title: "Continuous Monitoring",
      description: "24/7 health monitoring with proactive alerts, reminders, and ongoing support from our AI assistant.",
      icon: "fas fa-heartbeat"
    }
  ];

  return (
    <section id="how-it-works" className="how-it-works">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">How HealthGuard AI Works</h2>
          <p className="section-description">
            Simple, intelligent, and effective - your journey to better health in 4 easy steps
          </p>
        </div>
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.step}</div>
              <div className="step-icon">
                <i className={step.icon}></i>
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Telemedicine Section with Interactive Booking
const TelemedicineSection = () => {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <section id="telemedicine" className="telemedicine">
        <div className="container">
          <div className="telemedicine-content">
            <div className="telemedicine-info">
              <h2 className="section-title">Virtual Healthcare at Your Fingertips</h2>
              <p className="section-description">
                Connect with certified doctors and specialists through secure video consultations. 
                Get expert medical care without leaving your home.
              </p>
              <div className="telemedicine-features">
                <div className="tm-feature">
                  <i className="fas fa-shield-alt"></i>
                  <div>
                    <h4>Secure & Private</h4>
                    <p>End-to-end encrypted consultations ensuring complete privacy</p>
                  </div>
                </div>
                <div className="tm-feature">
                  <i className="fas fa-user-md"></i>
                  <div>
                    <h4>Certified Doctors</h4>
                    <p>Access to qualified medical professionals across all specialties</p>
                  </div>
                </div>
                <div className="tm-feature">
                  <i className="fas fa-prescription-bottle-alt"></i>
                  <div>
                    <h4>Digital Prescriptions</h4>
                    <p>Receive digital prescriptions and get medicines delivered</p>
                  </div>
                </div>
                <div className="tm-feature">
                  <i className="fas fa-clock"></i>
                  <div>
                    <h4>Flexible Scheduling</h4>
                    <p>Book appointments that fit your schedule, including emergency slots</p>
                  </div>
                </div>
              </div>
              <button className="btn-primary large" onClick={() => setActiveModal('telemedicine')}>
                <i className="fas fa-calendar-plus"></i>
                Book Consultation Now
              </button>
            </div>
            <div className="telemedicine-visual">
              <div className="consultation-mockup">
                <div className="video-header">
                  <span className="doctor-name">Dr. Priya Sharma</span>
                  <span className="specialty">General Physician</span>
                </div>
                <div className="video-screen">
                  <div className="doctor-avatar">
                    <i className="fas fa-user-md"></i>
                  </div>
                  <div className="consultation-info">
                    <span className="status live">Live Consultation</span>
                    <span className="duration">15:30 mins</span>
                  </div>
                </div>
                <div className="video-controls">
                  <button><i className="fas fa-microphone"></i></button>
                  <button><i className="fas fa-video"></i></button>
                  <button className="end-call"><i className="fas fa-phone-slash"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TelemedicineBooking isOpen={activeModal === 'telemedicine'} onClose={() => setActiveModal(null)} />
    </>
  );
};

// Community Section with Interactive Groups
const CommunitySection = () => {
  const [activeModal, setActiveModal] = useState(null);

  const communityGroups = [
    {
      name: "Diabetes Support",
      members: "15.2K",
      icon: "fas fa-heartbeat",
      description: "Managing diabetes together with tips, experiences, and support"
    },
    {
      name: "Mental Wellness", 
      members: "8.7K",
      icon: "fas fa-brain",
      description: "Mental health support and mindfulness practices"
    },
    {
      name: "Heart Health",
      members: "12.1K", 
      icon: "fas fa-heart",
      description: "Cardiovascular health tips and lifestyle guidance"
    },
    {
      name: "Women's Health",
      members: "22.3K",
      icon: "fas fa-venus",
      description: "Comprehensive women's health support and discussions"
    }
  ];

  return (
    <>
      <section id="community" className="community">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Join Our Health Community</h2>
            <p className="section-description">
              Connect with others on similar health journeys. Share experiences, 
              get support, and learn from a caring community.
            </p>
          </div>
          <div className="community-content">
            <div className="community-groups">
              {communityGroups.map((group, index) => (
                <div key={index} className="community-card">
                  <div className="community-icon">
                    <i className={group.icon}></i>
                  </div>
                  <h3 className="community-name">{group.name}</h3>
                  <p className="community-description">{group.description}</p>
                  <div className="community-stats">
                    <span className="member-count">
                      <i className="fas fa-users"></i>
                      {group.members} members
                    </span>
                  </div>
                  <button className="btn-outline" onClick={() => setActiveModal('community')}>
                    Join Group
                  </button>
                </div>
              ))}
            </div>
            <div className="community-benefits">
              <h3>Community Benefits</h3>
              <ul>
                <li><i className="fas fa-check"></i>Peer support and encouragement</li>
                <li><i className="fas fa-check"></i>Share experiences and tips</li>
                <li><i className="fas fa-check"></i>Expert moderated discussions</li>
                <li><i className="fas fa-check"></i>Weekly health challenges</li>
                <li><i className="fas fa-check"></i>Resource sharing and education</li>
              </ul>
              <button className="btn-primary" onClick={() => setActiveModal('community')}>
                Explore Communities
              </button>
            </div>
          </div>
        </div>
      </section>

      <CommunityPlatform isOpen={activeModal === 'community'} onClose={() => setActiveModal(null)} />
    </>
  );
};

// Keep existing Testimonials, Pricing, and Footer components as they were
const Testimonials = () => {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      location: "Mumbai, Maharashtra",
      rating: 5,
      text: "HealthGuard AI helped me identify early signs of diabetes. The personalized recommendations and 24/7 support have been life-changing.",
      avatar: "👨"
    },
    {
      name: "Priya Patel",
      location: "Ahmedabad, Gujarat", 
      rating: 5,
      text: "The telemedicine feature is amazing! I consulted with a specialist from home during pregnancy. The community support was invaluable.",
      avatar: "👩"
    },
    {
      name: "Dr. Amit Singh",
      location: "Delhi",
      rating: 5,
      text: "As a healthcare professional, I'm impressed by the accuracy of the AI symptom checker. It's a great tool for preliminary health assessment.",
      avatar: "👨‍⚕️"
    }
  ];

  return (
    <section className="testimonials">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">What Our Users Say</h2>
          <p className="section-description">
            Real stories from people whose lives have been transformed by HealthGuard AI
          </p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <i key={i} className="fas fa-star"></i>
                ))}
              </div>
              <p className="testimonial-text">"{testimonial.text}"</p>
              <div className="testimonial-author">
                <span className="author-avatar">{testimonial.avatar}</span>
                <div className="author-info">
                  <span className="author-name">{testimonial.name}</span>
                  <span className="author-location">{testimonial.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const plans = [
    {
      name: "Basic",
      price: "Free",
      period: "",
      features: [
        "Basic symptom checker",
        "Health tips and reminders",
        "Community access",
        "Basic health tracking"
      ],
      button: "Get Started",
      popular: false
    },
    {
      name: "Pro",
      price: "₹299",
      period: "/month",
      features: [
        "Advanced symptom analysis",
        "24/7 AI health assistant",
        "Telemedicine consultations",
        "Personalized health dashboard",
        "Priority community support",
        "Health risk predictions"
      ],
      button: "Start Free Trial",
      popular: true
    },
    {
      name: "Family",
      price: "₹499",
      period: "/month",
      features: [
        "Everything in Pro",
        "Up to 5 family members",
        "Family health insights",
        "Shared medical records",
        "Emergency alerts",
        "Dedicated family support"
      ],
      button: "Choose Family",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Choose Your Health Plan</h2>
          <p className="section-description">
            Affordable healthcare plans designed for individuals and families across India
          </p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="price">{plan.price}</span>
                <span className="period">{plan.period}</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <i className="fas fa-check"></i>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className={`btn-${plan.popular ? 'primary' : 'outline'} large`}>
                {plan.button}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    {
      question: 'How accurate is the AI health assistant?',
      answer: 'Our AI assistant provides general health information and guidance based on medical knowledge. However, it should not replace professional medical advice. Always consult healthcare professionals for diagnosis and treatment.'
    },
    {
      question: 'Is my health data secure?',
      answer: 'Yes, we prioritize your privacy and security. All health data is encrypted and stored securely. We never share your personal information with third parties without your consent.'
    },
    {
      question: 'Can I use this for emergency situations?',
      answer: 'No, this app is not for emergency situations. If you are experiencing a medical emergency, call emergency services (911) immediately or go to the nearest emergency room.'
    },
    {
      question: 'How do I book a telemedicine appointment?',
      answer: 'You can book telemedicine appointments through our platform. Simply navigate to the Telemedicine section, select your preferred doctor, and choose an available time slot.'
    }
  ];

  return (
    <section className="faq">
      <div className="container">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-grid">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <i className="fas fa-user-md"></i>
              <span>HealthGuard AI</span>
            </div>
            <p className="footer-description">
              Making quality healthcare accessible to every Indian through 
              intelligent AI technology and personalized care.
            </p>
            <div className="social-links">
              <a href="#"><i className="fab fa-facebook"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-instagram"></i></a>
              <a href="#"><i className="fab fa-linkedin"></i></a>
            </div>
          </div>
          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li><a href="#features">Symptom Checker</a></li>
              <li><a href="#features">AI Assistant</a></li>
              <li><a href="#telemedicine">Telemedicine</a></li>
              <li><a href="#community">Community</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 HealthGuard AI Companion. All rights reserved.</p>
          <p>Made with ❤️ for a healthier India</p>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
const App = () => {
  const [authed, setAuthed] = useState(!!authStorage.getToken());
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      setChecking(false);
      setAuthed(false);
      return;
    }
    apiMe(token).then(() => setAuthed(true)).catch(() => { authStorage.clear(); setAuthed(false); }).finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="app loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="app unauthed">
        <Header onAuthed={(ok) => ok && setAuthed(true)} onLogout={() => setAuthed(false)} />
        <section className="auth-gate">
          <div className="auth-gate-content">
            <h1><i className="fas fa-user-md"></i> Welcome to HealthGuard AI</h1>
            <p>Please login or create an account to continue.</p>
            <button className="btn-primary" onClick={() => document.querySelector('.header .btn-primary')?.click()}>Login / Sign Up</button>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app">
      <Header onLogout={() => setAuthed(false)} />
      <Hero />
      <Features />
      <HowItWorks />
      <TelemedicineSection />
      <CommunitySection />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
