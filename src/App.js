import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Plus, List, Grid } from 'lucide-react';

function App() {
  const [userRole, setUserRole] = useState('student'); // student, event_manager, admin, onsite_manager
  const [view, setView] = useState('list'); // list or calendar
  const [events, setEvents] = useState([])

  useEffect(() => {
  fetch("http://elec-refill.with.playit.plus:27077/event-api/events.php")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      return response.json();
    })
    .then(data => {
      setEvents(data);
    })
    .catch(error => {
      console.error(error);
    });
  }, []);

  const [registeredEvents, setRegisteredEvents] = useState([]);

  useEffect(() => {
  fetch("http://localhost/event-api/registeredevent.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      student_id: "S102312"  //TEMP STUDENT ID CHANGE WHEN SESSION IS ADDED
    }).toString()
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setRegisteredEvents(data.eventIds);
      }
    });
}, []);

  const handleRegister = (eventId) => {
    fetch("http://localhost/event-api/registerrequest.php", {
    method: "POST",
    headers: {
    "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
    student_id: "S102312",
    event_id: eventId
    }).toString()
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Registered successfully!");
        setRegisteredEvents(prev => [...prev, eventId]);
      } else {
        alert(data.message);
      }
    });
  };

  const EventCard = ({ event }) => {
    const isRegistered = registeredEvents.includes(event.id);
    const isFull = event.registered >= event.capacity;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-800">{event.title}</h3>
          <span className={`px-3 py-1 rounded-full text-sm ${
            isRegistered ? 'bg-green-100 text-green-700' : 
            isFull ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {isRegistered ? 'Registered' : isFull ? 'Full' : 'Open'}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4">{event.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{new Date(event.date).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}</span>
          </div>
          
          <div className="flex items-center text-gray-700">
            <Clock className="w-4 h-4 mr-2" />
            <span>{event.time}</span>
          </div>
          
          <div className="flex items-center text-gray-700">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{event.venue}</span>
          </div>
          
          <div className="flex items-center text-gray-700">
            <Users className="w-4 h-4 mr-2" />
            <span>{event.registered} / {event.capacity} registered</span>
          </div>
        </div>

        {userRole === 'student' && (
          <button
            onClick={() => handleRegister(event.id)}
            disabled={isRegistered || isFull}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
              isRegistered || isFull
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRegistered ? 'Already Registered' : isFull ? 'Event Full' : 'Register'}
          </button>
        )}

        {userRole === 'event_manager' && (
          <button className="w-full py-2 px-4 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition">
            Edit Event
          </button>
        )}
      </div>
    );
  };

  const CalendarView = () => {
    const eventsByDate = events.reduce((acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {});

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Calendar View</h2>
        <div className="space-y-4">
          {Object.entries(eventsByDate).map(([date, dayEvents]) => (
            <div key={date} className="border-l-4 border-blue-500 pl-4">
              <div className="font-semibold text-lg mb-2">
                {new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric' 
                })}
              </div>
              {dayEvents.map(event => (
                <div key={event.id} className="mb-2 p-3 bg-gray-50 rounded">
                  <div className="font-semibold">{event.time} - {event.title}</div>
                  <div className="text-sm text-gray-600">{event.venue}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold">Event Schedule System</h1>
          <p className="text-blue-100">Group 10 - Event Management Platform</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Role Selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <label className="block text-sm font-semibold mb-2">Select Role:</label>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="student">Student/Guest</option>
            <option value="event_manager">Event Manager</option>
            <option value="admin">Administrator</option>
            <option value="onsite_manager">On-site Manager</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              view === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              view === 'calendar' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar View
          </button>
        </div>

        {/* Action Buttons based on Role */}
        {userRole === 'event_manager' && (
          <button className="mb-6 flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
            <Plus className="w-5 h-5" />
            Create New Event
          </button>
        )}

        {userRole === 'admin' && (
          <div className="flex gap-3 mb-6">
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">
              Export Event History
            </button>
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
              Manage Registrations
            </button>
            <button className="px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition">
              Send Announcements
            </button>
          </div>
        )}

        {userRole === 'onsite_manager' && (
          <div className="flex gap-3 mb-6">
            <button className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition">
              Manage Venue Requests
            </button>
            <button className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition">
              Enable Venues
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {view === 'list' ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                {userRole === 'student' && registeredEvents.length > 0 
                  ? 'Available Events' 
                  : 'All Events'}
              </h2>
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <CalendarView />
          )}

          {/* My Registered Events (Student only) */}
          {userRole === 'student' && registeredEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">My Registered Events</h2>
              {events
                .filter(event => registeredEvents.includes(event.id))
                .map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;