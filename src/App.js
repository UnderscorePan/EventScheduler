import React, { useState, useEffect } from 'react';
import LoginPage from './login/LoginPage';
import { Calendar, Clock, MapPin, Users, Plus, List } from 'lucide-react';


function App() {
  const [userID, setUserID] = useState(() => {
  return sessionStorage.getItem('userID');
  });
  const [userRole, setUserRole] = useState(() => {
  return sessionStorage.getItem('userRole') || 'student';
  });
  const [view, setView] = useState('list'); 
  const [events, setEvents] = useState([]);
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);

  const [authenticated, setAuthenticated] = useState(() => {
  return sessionStorage.getItem('auth') === 'true';
  });

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
  if (!userID) return;

  fetch("http://elec-refill.with.playit.plus:27077/event-api/registeredevent.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      student_id: userID
    }).toString()
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setRegisteredEvents(data.eventIds);
      }
    });
}, [userID]);

  const handleRegister = (eventId, userID) => {
    console.log(userID);
    console.log(userRole);
    fetch("http://elec-refill.with.playit.plus:27077/event-api/registerrequest.php", {
    method: "POST",
    headers: {
    "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
    student_id: userID,
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

  const fetchPendingRegistrations = () => {
    fetch("http://elec-refill.with.playit.plus:27077/event-api/fetchpendingrequestadmin.php")
      .then(res => res.json())
      .then(data => {
        console.log("API Response:", data);
        // Handle if data is an array directly or wrapped in an object
        if (Array.isArray(data)) {
          setPendingRegistrations(data);
        } else if (data.success) {
          setPendingRegistrations(data.requests || []);
        } else if (data.requests) {
          setPendingRegistrations(data.requests);
        } else {
          setPendingRegistrations([]);
        }
      })
      .catch(error => {
        console.error("Error fetching pending registrations:", error);
        setPendingRegistrations([]);
      });
  };

  const handleApproveRegistration = (registrationId) => {
    fetch("http://elec-refill.with.playit.plus:27077/event-api/approvependingrequestadmin.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        request_id: registrationId
      }).toString()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Registration approved!");
          fetchPendingRegistrations();
        } else {
          alert(data.message || "Failed to approve registration");
        }
      })
      .catch(error => {
        console.error("Error approving registration:", error);
      });
  };

  const handleDenyRegistration = (registrationId) => {
    fetch("http://elec-refill.with.playit.plus:27077/event-api/denypendingrequestadmin.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        request_id: registrationId
      }).toString()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Registration denied!");
          fetchPendingRegistrations();
        } else {
          alert(data.message || "Failed to deny registration");
        }
      })
      .catch(error => {
        console.error("Error denying registration:", error);
      });
  };

  const openRegistrationPopup = () => {
    fetchPendingRegistrations();
    setShowRegistrationPopup(true);
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
            onClick={() => handleRegister(event.id, userID)}
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

  const handleLogin = (id, role = 'student') => {
    sessionStorage.setItem('auth', 'true');
    sessionStorage.setItem('userID', id);
    sessionStorage.setItem('userRole', role);
    setUserRole(role);
    setUserID(id);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userID');
    setAuthenticated(false);
    setUserRole('student');
    setUserID('');
  };

  if (!authenticated) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Event Schedule System</h1>
              <p className="text-blue-100">Group 10 - Event Management Platform</p>
            </div>
            <div>
              <button onClick={handleLogout} className="bg-white text-blue-600 px-3 py-1 rounded-md font-semibold">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Role Selector */}
        {/* Current Role Display */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Current Role:</label>
              <span className="text-lg font-bold text-blue-600">
                {userRole === 'student' ? 'Student/Guest' : 
                userRole === 'event_manager' ? 'Event Manager' :
                userRole === 'admin' ? 'Administrator' : 'On-site Manager'}
              </span>
            </div>
          </div>
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
            <button 
              onClick={openRegistrationPopup}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Manage Registrations
            </button>
            <button className="px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition">
              Send Announcements
            </button>
          </div>
        )}

        {userRole === 'on_site_manager' && (
          <div className="flex gap-3 mb-6">
            <button className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition">
              Manage Venue Requests
            </button>
            <button className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition">
              Enable Venues
            </button>
          </div>
        )}

        {/* Registration Management Popup */}
        {showRegistrationPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Manage Registration Requests</h2>
                <button 
                  onClick={() => setShowRegistrationPopup(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {pendingRegistrations.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pending registration requests.</p>
              ) : (
                <div className="space-y-4">
                  {pendingRegistrations.map((request) => (
                    <div 
                      key={request.registrationid} 
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Registration ID: {request.registrationid}
                          </h3>
                          <p className="text-gray-600 mt-2">
                            <span className="font-medium">Student ID:</span> {request.studentid}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium">Event ID:</span> {request.eventid}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium">Date:</span> {request.date}
                          </p>
                          <p className="text-gray-600">
                            <span className="font-medium">Time:</span> {request.time}
                          </p>
                          <p className="text-gray-600">
                            <span className={`font-medium px-2 py-1 rounded text-sm ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              Status: {request.status}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveRegistration(request.registrationid)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDenyRegistration(request.registrationid)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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