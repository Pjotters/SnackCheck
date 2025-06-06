import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from './config';

const DailyQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysQuestions();
  }, []);

  const fetchTodaysQuestions = async () => {
    try {
      const response = await axios.get(`${API}/daily-questions/today`);
      if (Array.isArray(response.data)) {
        setQuestions(response.data);
      } else {
        console.error('Error: /daily-questions/today did not return an array:', response.data);
        setQuestions([]); // Default to empty array
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (questionId, answer) => {
    try {
      await axios.post(`${API}/question-responses`, {
        question_id: questionId,
        answer: answer
      });
      alert('Antwoord ingediend! +5 punten verdiend 🎉');
      // Remove answered question from display
      setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== questionId));
    } catch (error) {
      if (error.response?.status === 400) {
        alert('Je hebt deze vraag al beantwoord!');
      } else {
        alert('Er ging iets mis bij het indienen van je antwoord');
      }
    }
  };

  if (loading) {
    return <div className="text-center">Vragen laden...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="text-6xl mb-4">❓</div>
        <p className="text-gray-500 text-lg">Geen vragen beschikbaar voor vandaag</p>
        <p className="text-gray-400 text-sm mt-2">Kom morgen terug voor nieuwe vragen!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        ❓ Dagelijkse Vragen
        <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
          +5 punten per vraag
        </span>
      </h2>
      
      {questions.map((question) => (
        <div key={question.id} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{question.question}</h3>
          <div className="space-y-2">
            {Array.isArray(question.options) && question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => submitAnswer(question.id, option)}
                className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition duration-200"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DailyQuestions;
