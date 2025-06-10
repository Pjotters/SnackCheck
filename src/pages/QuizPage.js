import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, CheckCircle, XCircle, Clock } from 'react-feather';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../config';

const QuizPage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minuten in seconden
  const navigate = useNavigate();

  // Laad vragen
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API}/quiz/questions`, {
          headers: {
            'Authorization': `Basic ${btoa('testuser:test123')}`
          }
        });
        setQuestions(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Fout bij ophalen vragen:', err);
        setError('Kon vragen niet ophalen. Probeer het later opnieuw.');
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Timer logica
  useEffect(() => {
    if (loading || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleQuizComplete();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, quizCompleted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleOptionSelect = (optionId) => {
    if (showResult || quizCompleted) return;
    setSelectedOption(optionId);
  };

  const handleNextQuestion = async () => {
    if (selectedOption === null || showResult) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentQuestion.options.find(opt => opt.id === selectedOption)?.correct;
    
    if (isCorrect) {
      setScore(prev => prev + 10); // 10 punten per goed antwoord
    }

    setShowResult(true);
    
    // Wacht even voordat we naar de volgende vraag gaan
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      // Quiz afgerond
      handleQuizComplete();
    }
  };

  const handleQuizComplete = async () => {
    if (quizCompleted) return;
    
    try {
      await axios.post(
        `${API}/quiz/submit`,
        {
          answers: questions.map((q, idx) => ({
            questionId: q.id,
            optionId: selectedOption // Vereenvoudigd voor dit voorbeeld
          }))
        },
        {
          headers: {
            'Authorization': `Basic ${btoa('testuser:test123')}`
          }
        }
      );
      setQuizCompleted(true);
    } catch (err) {
      console.error('Fout bij opslaan resultaten:', err);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white rounded-xl shadow-md p-8"
        >
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-6">
            <Award className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz voltooid!</h1>
          <p className="text-xl text-blue-600 font-medium mb-8">Je hebt {score} punten verdiend!</p>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Jouw resultaat</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Aantal vragen</span>
                <span className="font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Goede antwoorden</span>
                <span className="text-green-600 font-medium">{score / 10} van de {questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Behaalde punten</span>
                <span className="font-medium">{score} punten</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Opnieuw spelen
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
              Terug naar home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Terug
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dagelijkse Quiz</h1>
        <p className="text-gray-600">Test je kennis en verdien extra punten!</p>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header met voortgang en tijd */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <span className="text-sm font-medium text-gray-700">
                Vraag {currentQuestionIndex + 1} van {questions.length}
              </span>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <motion.div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <Clock className="h-4 w-4 mr-1.5" />
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-600">
              {score} punten
            </span>
            <span className="text-sm text-gray-500">
              +10 punten per goed antwoord
            </span>
          </div>
        </div>

        {/* Vraag en antwoorden */}
        <div className="p-6">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-medium text-gray-900 mb-6">
              {currentQuestion?.question}
            </h2>
            
            <div className="space-y-3 mb-6">
              {currentQuestion?.options.map((option) => {
                const isSelected = selectedOption === option.id;
                let optionClasses = "p-4 border rounded-lg cursor-pointer transition-colors ";
                
                if (showResult) {
                  if (option.correct) {
                    optionClasses += "bg-green-50 border-green-200";
                  } else if (isSelected && !option.correct) {
                    optionClasses += "bg-red-50 border-red-200";
                  } else {
                    optionClasses += "border-gray-200";
                  }
                } else {
                  optionClasses += isSelected 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-blue-300";
                }
                
                return (
                  <motion.div
                    key={option.id}
                    whileHover={{ scale: showResult ? 1 : 1.02 }}
                    whileTap={{ scale: showResult ? 1 : 0.99 }}
                    className={optionClasses}
                    onClick={() => handleOptionSelect(option.id)}
                  >
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mr-3 ${
                        isSelected 
                          ? option.correct 
                            ? 'border-green-500 bg-green-100' 
                            : 'border-red-500 bg-red-100'
                          : option.correct && showResult
                            ? 'border-green-500 bg-green-100'
                            : 'border-gray-300'
                      }`}>
                        {showResult && option.correct && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {showResult && isSelected && !option.correct && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <span className="text-gray-700">{option.text}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleNextQuestion}
                disabled={selectedOption === null || showResult}
                className={`px-6 py-2.5 rounded-md text-white font-medium ${
                  selectedOption === null || showResult
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Volgende' : 'Afronden'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
