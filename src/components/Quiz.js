import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Award } from 'react-feather';
import axios from 'axios';
import { API } from '../config';

const Quiz = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  const handleNextQuestion = async () => {
    if (selectedOption === null) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentQuestion.options.find(opt => opt.id === selectedOption)?.correct;
    
    if (isCorrect) {
      setScore(prev => prev + 10); // 10 punten per goed antwoord
    }

    if (currentQuestionIndex < questions.length - 1) {
      setShowResult(true);
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowResult(false);
      }, 1500);
    } else {
      // Quiz afgerond
      try {
        await axios.post(`${API}/quiz/submit`, {
          answers: questions.map((q, idx) => ({
            questionId: q.id,
            optionId: selectedOption // Vereenvoudigd voor dit voorbeeld
          }))
        }, {
          headers: {
            'Authorization': `Basic ${btoa('testuser:test123')}`
          }
        });
        setQuizCompleted(true);
      } catch (err) {
        console.error('Fout bij opslaan resultaten:', err);
      }
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-6 bg-white rounded-lg shadow-md"
      >
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <Award className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">Quiz afgerond!</h2>
        <p className="mt-2 text-gray-600">Je hebt {score} punten verdiend!</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Opnieuw spelen
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Vraag {currentQuestionIndex + 1} van {questions.length}
          </span>
          <span className="text-sm font-medium text-blue-600">
            {score} punten
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <motion.div 
            className="bg-blue-600 h-2.5 rounded-full" 
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-white p-6 rounded-lg shadow-md mb-6"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {currentQuestion?.question}
          </h3>
          
          <div className="space-y-3">
            {currentQuestion?.options.map((option) => (
              <motion.div
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedOption === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => !showResult && handleOptionSelect(option.id)}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mr-3 ${
                    selectedOption === option.id ? 'border-blue-500 bg-blue-100' : 'border-gray-300'
                  }`}>
                    {showResult && option.correct && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {showResult && selectedOption === option.id && !option.correct && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <span className="text-gray-700">{option.text}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          onClick={handleNextQuestion}
          disabled={selectedOption === null || showResult}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            selectedOption === null || showResult
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {currentQuestionIndex < questions.length - 1 ? 'Volgende' : 'Afronden'}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
