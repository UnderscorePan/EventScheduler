import React, { useState, useEffect, useRef } from 'react';
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
  const [showCreateEventPopup, setShowCreateEventPopup] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    eventName: '',
    about: '',
    date: '',
    time: '',
    time2: '',
    venue: '',
    participants: '',
    manager_id: userID
  });
  const [venues, setVenues] = useState([]);
  const [showVenueRequestPopup, setShowVenueRequestPopup] = useState(false);
  const [pendingVenueRequests, setPendingVenueRequests] = useState([]);
  const [showEnableVenuePopup, setShowEnableVenuePopup] = useState(false);
  const [venueAvailability, setVenueAvailability] = useState({});
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Keep a map of local patches for events that were updated locally but
  // may not immediately appear in the backend events feed. Key is event id.
  const pendingPatchesRef = useRef({});

  // Persist pending patches to survive a full page reload so the optimistic
  // UI doesn't permanently revert while server-side persists are delayed.
  const PENDING_PATCHES_KEY = 'pendingEventPatches';

  // Load persisted patches (if any) into the ref on first render
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_PATCHES_KEY);
      if (raw) {
        pendingPatchesRef.current = JSON.parse(raw) || {};
        console.log('Loaded pending patches from localStorage:', pendingPatchesRef.current);
      }
    } catch (e) {
      console.warn('Failed to load pending patches from localStorage', e);
    }
  }, []);

  const savePendingPatches = () => {
    try {
      localStorage.setItem(PENDING_PATCHES_KEY, JSON.stringify(pendingPatchesRef.current || {}));
    } catch (e) {
      console.warn('Failed to save pending patches to localStorage', e);
    }
  };

  // Poll the server a few times to confirm the pending patch was persisted.
  // If confirmed, remove the pending patch. If not, log differences for debugging.
  const checkPatchConfirmation = (eventKey, patch, attempts = 3, delay = 2000) => {
    if (!eventKey) return;

    const attemptFetch = (remaining) => {
  const url = `http://elec-refill.with.playit.plus:27077/event-api/events.php?_=${Date.now()}`;
  fetch(url, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          const fetched = normalizeEventsResponse(data) || [];
          const ev = fetched.find(e => String(e.id ?? e.event_id ?? e.eventId) === String(eventKey));
          if (!ev) {
            console.warn(`Event ${eventKey} not found in server feed (attempt ${attempts - remaining + 1}).`);
            if (remaining > 1) setTimeout(() => attemptFetch(remaining - 1), delay);
            else console.error(`Event ${eventKey} missing after ${attempts} attempts.`);
            return;
          }

          const keysToCompare = ['title','description','date','time','endtime','venue','capacity'];
          const matches = keysToCompare.every(k => {
            if (patch[k] === undefined) return true;
            return String(ev[k] ?? '') === String(patch[k] ?? '');
          });

          if (matches) {
            // Server confirmed the patch — remove it from pending storage.
            delete pendingPatchesRef.current[String(eventKey)];
            savePendingPatches();
            console.log(`Server confirmed patch for event ${eventKey}. Removed pending patch.`);
          } else {
            console.warn(`Server does not match patch for event ${eventKey} (attempt ${attempts - remaining + 1}).`, { server: ev, patch });
            if (remaining > 1) setTimeout(() => attemptFetch(remaining - 1), delay);
            else console.error(`Patch for event ${eventKey} not confirmed after ${attempts} attempts.`);
          }
        })
        .catch(err => {
          console.error('Error checking server confirmation for event', eventKey, err);
          if (remaining > 1) setTimeout(() => attemptFetch(remaining - 1), delay);
        });
    };

    attemptFetch(attempts);
  };

  const [authenticated, setAuthenticated] = useState(() => {
  return sessionStorage.getItem('auth') === 'true';
  });

  
const normalizeEventsResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.events)) return data.events;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

const refreshEvents = () => {
  const url = `http://elec-refill.with.playit.plus:27077/event-api/events.php?_=${Date.now()}`;
  fetch(url, { cache: "no-store" })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      return response.json();
    })
    .then(data => {
      const fetched = normalizeEventsResponse(data) || [];

      // Merge any locally-patched events so UI reflects the user's edit
      // until the backend feed returns the same updated values.
      const merged = fetched.map(ev => {
        const evId = ev.id ?? ev.event_id ?? ev.eventId;
        const patch = pendingPatchesRef.current[String(evId)];
        if (!patch) return ev;

        // If backend already matches our patch, drop the pending patch.
        const keysToCompare = ['title','description','date','time','endtime','venue','capacity'];
        const matches = keysToCompare.every(k => {
          if (patch[k] === undefined) return true;
          return String(ev[k] ?? '') === String(patch[k] ?? '');
        });
        if (matches) {
          delete pendingPatchesRef.current[String(evId)];
          savePendingPatches();
          return ev;
        }

        // Otherwise, favor the local patch values so the UI doesn't revert.
        return { ...ev, ...patch };
      });

      setEvents(merged);

      // If any pending patches remain after merging, warn the user in console
      // and optionally show a brief alert so they know the server hasn't
      // confirmed persistence yet.
      const remaining = Object.keys(pendingPatchesRef.current || {});
      if (remaining.length > 0) {
        console.warn('There are pending event patches not yet confirmed by the server:', remaining);
        // Don't spam alerts on every refresh; only show once per refresh call.
        // Use a non-blocking notification — console + optional alert:
        // alert('Some updates are still pending server confirmation and may be reverted until the server reflects them.');
      }
    })
    .catch(error => {
      console.error("Refresh events failed:", error);
    });
};

useEffect(() => {
  refreshEvents();
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

  const fetchPendingVenueRequests = () => {
  fetch("http://elec-refill.with.playit.plus:27077/event-api/fetchvenuerequestosm.php")
      .then(res => res.json())
      .then(data => {
        console.log("Venue requests API response:", data);
        let venueData = [];
        if (Array.isArray(data)) {
          venueData = data;
        } else if (Array.isArray(data.data)) {
          venueData = data.data;
        } else if (Array.isArray(data.requests)) {
          venueData = data.requests;
        } else if (Array.isArray(data.result)) {
          venueData = data.result;
        }
        console.log("Setting venue requests:", venueData);
        setPendingVenueRequests(venueData);
      })
      .catch(error => {
        console.error("Error fetching venue requests:", error);
        setPendingVenueRequests([]);
      });
  };

  const handleApproveVenueRequest = (requestId) => {
  fetch("http://elec-refill.with.playit.plus:27077/event-api/approvevenuerequestosm.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        request_id: requestId
      }).toString()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Venue request approved!");
          fetchPendingVenueRequests();
        } else {
          alert(data.message || "Failed to approve venue request");
        }
      })
      .catch(error => {
        console.error("Error approving venue request:", error);
      });
  };

  const handleDenyVenueRequest = (requestId) => {
  fetch("http://elec-refill.with.playit.plus:27077/event-api/denyvenuerequestosm.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        request_id: requestId
      }).toString()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Venue request denied!");
          fetchPendingVenueRequests();
        } else {
          alert(data.message || "Failed to deny venue request");
        }
      })
      .catch(error => {
        console.error("Error denying venue request:", error);
      });
  };

  const openVenueRequestPopup = () => {
    fetchPendingVenueRequests();
    setShowVenueRequestPopup(true);
  };

  const fetchVenues = () => {
  fetch("http://elec-refill.with.playit.plus:27077/event-api/getalleventvenue.php")
      .then(res => res.json())
      .then(data => {
        console.log("Venues API response:", data);
        let venueData = [];
        if (Array.isArray(data)) {
          venueData = data;
        } else if (Array.isArray(data.data)) {
          venueData = data.data;
        } else if (Array.isArray(data.venues)) {
          venueData = data.venues;
        }
        setVenues(venueData);
      })
      .catch(error => {
        console.error("Error fetching venues:", error);
        setVenues([]);
      });
  };

  const handleToggleVenue = (venueId, currentStatus) => {
  fetch("http://elec-refill.with.playit.plus:27077/event-api/enablevenue.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        venue_id: venueId,
        enable: currentStatus ? '0' : '1'
      }).toString()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert(`Venue ${currentStatus ? 'disabled' : 'enabled'} successfully!`);
          fetchVenues();
        } else {
          alert(data.message || "Failed to update venue status");
        }
      })
      .catch(error => {
        console.error("Error toggling venue:", error);
      });
  };

  const openEnableVenuePopup = () => {
    fetchVenues();
    setShowEnableVenuePopup(true);
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

const checkVenueAvailability = (date, startTime, endTime) => {
  if (!date || !startTime || !endTime) {
    setVenueAvailability({});
    return;
  }

  /**
   * Accepts:
   * - "13:00" (24h)
   * - "1:00 PM" (12h)
   */
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const trimmed = String(timeStr).trim();

    // 12h: "H:MM AM/PM"
    const m12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (m12) {
      let h = parseInt(m12[1], 10);
      const m = parseInt(m12[2], 10);
      const period = m12[3].toUpperCase();

      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;

      return h * 60 + m;
    }

    // 24h: "HH:MM"
    const m24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      const h = parseInt(m24[1], 10);
      const m = parseInt(m24[2], 10);
      return h * 60 + m;
    }

    return null;
  };

  const newStartMinutes = timeToMinutes(startTime);
  const newEndMinutes = timeToMinutes(endTime);

  if (newStartMinutes === null || newEndMinutes === null) {
    setVenueAvailability({});
    return;
  }

  // Fallback duration if backend only returns a start time
  const DEFAULT_EVENT_DURATION_MIN = 60;

  const availability = {};
  venues.forEach((venue) => {
    const hasConflict = events.some((event) => {
      if (event.venue !== venue || event.date !== date) return false;

      let eventStartMinutes = null;
      let eventEndMinutes = null;

      // Legacy: "1:00 PM - 2:00 PM"
      if (event.time && String(event.time).includes(' - ')) {
        const [start, end] = String(event.time).split(' - ').map((s) => s.trim());
        eventStartMinutes = timeToMinutes(start);
        eventEndMinutes = timeToMinutes(end);
      } else {
        // Modern: event.time = "13:00" (and maybe event.endtime)
        eventStartMinutes = timeToMinutes(event.time);
        const maybeEnd =
          (event.endtime ?? event.time2 ?? event.end_time ?? event.endTime ?? null);

        if (maybeEnd) {
          eventEndMinutes = timeToMinutes(maybeEnd);
        } else if (eventStartMinutes !== null) {
          eventEndMinutes = eventStartMinutes + DEFAULT_EVENT_DURATION_MIN;
        }
      }

      if (eventStartMinutes === null || eventEndMinutes === null) return false;

      // Overlap check: (newStart < eventEnd) && (newEnd > eventStart)
      return (newStartMinutes < eventEndMinutes) && (newEndMinutes > eventStartMinutes);
    });

    availability[venue] = !hasConflict;
  });

  setVenueAvailability(availability);
};


  const handleCreateEventInputChange = (field, value) => {
    setNewEvent(prev => ({
      ...prev,
      [field]: value
    }));

    // Check venue availability when date or time changes
    if (field === 'date' || field === 'time' || field === 'time2' || field === 'venue') {
      const updatedEvent = { ...newEvent, [field]: value };
      checkVenueAvailability(
        updatedEvent.date,
        updatedEvent.time,
        updatedEvent.time2
      );
    }
  };

  const handleCreateEvent = () => {
    // Validate all fields
    if (!newEvent.eventName || !newEvent.about || !newEvent.date || 
        !newEvent.time || !newEvent.time2 || !newEvent.venue || 
        !newEvent.participants) {
      alert('Please fill in all fields');
      return;
    }

    // Check if selected venue is available
    if (venueAvailability[newEvent.venue] === false) {
      alert('Selected venue is not available at this time');
      return;
    }

  fetch("http://elec-refill.with.playit.plus:27077/event-api/addevent.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        title: newEvent.eventName,
        description: newEvent.about,
        date: newEvent.date,
        time: newEvent.time,
        endtime: newEvent.time2,
        venue: newEvent.venue,
        capacity: newEvent.participants,
        manager_id: userID
      }).toString()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Event created successfully!");
          setShowCreateEventPopup(false);
          // Reset form
          setNewEvent({
            eventName: '',
            about: '',
            date: '',
            time: '',
            time2: '',
            venue: '',
            participants: '',
            manager_id: userID
          });
          setVenueAvailability({});
          // Refresh events list
          refreshEvents();
        } else {
          alert(data.message || "Failed to create event");
        }
      })
      .catch(error => {
        console.error("Error creating event:", error);
        alert("Network error");
      });
  };

  const openCreateEventPopup = () => {
    // Ensure we have the latest venue list before opening the create dialog
    fetchVenues();
    setIsEditMode(false);
    setEditingEventId(null);
    setNewEvent({
      eventName: '',
      about: '',
      date: '',
      time: '',
      time2: '',
      venue: '',
      participants: '',
      manager_id: userID
    });
    setVenueAvailability({});
    setShowCreateEventPopup(true);
  };

  const closeEventPopup = () => {
    setShowCreateEventPopup(false);
    setIsEditMode(false);
    setEditingEventId(null);
    setVenueAvailability({});
    setNewEvent({
      eventName: '',
      about: '',
      date: '',
      time: '',
      time2: '',
      venue: '',
      participants: '',
      manager_id: userID
    });
  };

  const openEditEventPopup = (event) => {
    setIsEditMode(true);
    const id = event.id ?? event.event_id ?? event.eventId;
    setEditingEventId(id);

    
// Parse time for edit form.
// Backend may return:
// - event.time: "13:00" (and sometimes event.endtime)
// - legacy: "1:00 PM - 2:00 PM"
let startTime = '';
let endTime = '';

const pad2 = (n) => String(n).padStart(2, '0');

const addMinutesTo24h = (hhmm, addMin = 60) => {
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  const h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const total = (h * 60 + mins + addMin) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${pad2(nh)}:${pad2(nm)}`;
};

const convertTo24Hour = (time12) => {
  if (!time12) return '';
  const parts = String(time12).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!parts) return String(time12).trim(); // already 24h or unknown
  let hours = parseInt(parts[1], 10);
  const minutes = parts[2];
  const period = parts[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return `${pad2(hours)}:${minutes}`;
};

if (event.time) {
  const t = String(event.time).trim();
  if (t.includes(' - ')) {
    const [start, end] = t.split(' - ').map((s) => s.trim());
    startTime = convertTo24Hour(start);
    endTime = convertTo24Hour(end);
  } else {
    startTime = t; // likely "13:00"
    const maybeEnd = event.endtime ?? event.time2 ?? event.end_time ?? event.endTime ?? '';
    endTime = maybeEnd ? String(maybeEnd).trim() : addMinutesTo24h(startTime, 60);
  }
}

    // Format date to YYYY-MM-DD for the date input
    let formattedDate = event.date ?? '';
    if (formattedDate && !formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // If date is not in YYYY-MM-DD format, try to convert it
      try {
        const dateObj = new Date(formattedDate);
        formattedDate = dateObj.toISOString().split('T')[0];
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }

    const eventVenueId = event.venue ?? event.venue_id ?? event.venueId ?? '';

    // Ensure venues list is loaded so the select shows options
    fetchVenues();

    setNewEvent({
      eventName: event.title ?? '',
      about: event.description ?? '',
      date: formattedDate,
      time: startTime,
      time2: endTime,
      venue: eventVenueId,
      participants: String(event.capacity ?? ''),
      manager_id: userID
    });

    setVenueAvailability({});
    setShowCreateEventPopup(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEventId) {
      alert("Missing event ID to update.");
      return;
    }

    // Validate all fields
    if (!newEvent.eventName || !newEvent.about || !newEvent.date ||
        !newEvent.time || !newEvent.time2 || !newEvent.venue ||
        !newEvent.participants) {
      alert('Please fill in all fields');
      return;
    }

    // Optional: keep your venue availability rule (if you want)
    if (venueAvailability[newEvent.venue] === false) {
      alert('Selected venue is not available at this time');
      return;
    }

    // Keep 24-hour time format for API (e.g. "13:00")
    const startTime24 = newEvent.time;
    const endTime24 = newEvent.time2;

    console.log('Updating event with ID:', editingEventId);
    
    const updateParams = {
      event_id: editingEventId,
      eventName: newEvent.eventName,    // Try eventName
      title: newEvent.eventName,         // Also send as title
      about: newEvent.about,             // Try about
      description: newEvent.about,       // Also send as description
      date: newEvent.date,
      time: startTime24,
      endtime: endTime24,
      time2: endTime24,                  // Try time2 as well
      venue: newEvent.venue,
      participants: newEvent.participants, // Try participants
      capacity: newEvent.participants,     // Also send as capacity
      manager_id: userID
    };
    
    console.log('Update data:', updateParams);

  fetch("http://elec-refill.with.playit.plus:27077/event-api/editevent.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(updateParams).toString()
    })
      .then(res => {
        console.log('Response status:', res.status);
        return res.text();
      })
      .then(text => {
        console.log('Raw response:', text);
        try {
          const data = JSON.parse(text);
          console.log('Parsed API response:', data);
          if (data.success) {
          alert("Event updated successfully!");

          // Update UI immediately (so you see changes even if events.php is cached)
          const timeRange = startTime24;

          const patch = {
            title: newEvent.eventName,
            description: newEvent.about,
            date: newEvent.date,
            time: timeRange,  // Use the full time range format
            endtime: endTime24,
            venue: newEvent.venue,
            capacity: Number(newEvent.participants)
          };

          try {
            const key = editingEventId ?? (data.eventId ?? data.event_id);
            if (key) {
              pendingPatchesRef.current[String(key)] = patch;
              savePendingPatches();
              // Start confirmation polling so we know whether the server
              // actually persisted the change; this will remove the pending
              // patch when the server reflects the edit.
              checkPatchConfirmation(key, patch, 4, 2000);
            }
          } catch (e) {
            // non-fatal
            console.warn('Failed to record pending patch', e);
          }

          setEvents(prev =>
            prev.map(ev => {
              const evId = ev.id ?? ev.event_id ?? ev.eventId;
              return String(evId) === String(editingEventId) ? { ...ev, ...patch } : ev;
            })
          );

          closeEventPopup();
          
          setTimeout(() => {
            console.log('Refreshing events from database...');
            refreshEvents();
          }, 2000);
        } else {
          alert(data.message || "Failed to update event");
          console.error('Update failed:', data);
        }
        } catch (e) {
          console.error('Failed to parse JSON:', e);
          alert('Server returned invalid response');
        }
      })
      .catch(error => {
        console.error("Error updating event:", error);
        alert("Network error");
      });
  };

  const EventCard = ({ event }) => {
    const isRegistered = registeredEvents.includes(event.id);
    const isFull = event.registered >= event.capacity;

    return (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md p-6 mb-4 border`}>
        <div className="flex justify-between items-start mb-3">
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{event.title}</h3>
          <span className={`px-3 py-1 rounded-full text-sm ${
            isRegistered ? 'bg-green-100 text-green-700' : 
            isFull ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {isRegistered ? 'Registered' : isFull ? 'Full' : 'Open'}
          </span>
        </div>
        
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>{event.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <Calendar className="w-4 h-4 mr-2" />
            <span>{new Date(event.date).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}</span>
          </div>
          
          <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <Clock className="w-4 h-4 mr-2" />
            <span>{event.time}</span>
          </div>
          
          <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <MapPin className="w-4 h-4 mr-2" />
            <span>{event.venue}</span>
          </div>
          
          <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
          <button
            onClick={() => openEditEventPopup(event)}
            className="w-full py-2 px-4 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 transition"
          >
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
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
        <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Calendar View</h2>
        <div className="space-y-4">
          {Object.entries(eventsByDate).map(([date, dayEvents]) => (
            <div key={date} className={`border-l-4 ${darkMode ? 'border-blue-600' : 'border-blue-500'} pl-4`}>
              <div className={`font-semibold text-lg mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                {new Date(date).toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric' 
                })}
              </div>
              {dayEvents.map(event => (
                <div key={event.id} className={`mb-2 p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                  <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{event.time} - {event.title}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{event.venue}</div>
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

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
  };

  if (!authenticated) return <LoginPage onLogin={handleLogin} />;

  // Normalize venue objects (API may return strings or objects). Each option has {id,label,enabled}
  const venueOptions = (venues || []).map(v => {
    if (!v) return null;
    if (typeof v === 'string') return { id: String(v), label: v, enabled: true };
    const id = v.venueId ?? v.venue_id ?? v.id ?? v.venue ?? v.name ?? '';
    const label = v.venueName ?? v.venue_name ?? v.name ?? id;
    const enabled = v.isEnabled ?? v.is_enabled ?? v.enabled ?? true;
    return { id: String(id), label, enabled };
  }).filter(Boolean);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-blue-600'} text-white shadow-lg`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Event Schedule System</h1>
              <p className={`${darkMode ? 'text-gray-300' : 'text-blue-100'}`}>Group 10 - Event Management Platform</p>
            </div>
            <div className="flex gap-3 items-center">
              <button 
                onClick={toggleDarkMode}
                className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-blue-600'} px-3 py-1 rounded-md font-semibold hover:opacity-90 transition`}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button onClick={handleLogout} className="bg-white text-blue-600 px-3 py-1 rounded-md font-semibold">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Role Selector */}
        {/* Current Role Display */}
        <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-md p-4 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Current Role:</label>
              <span className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
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
                ? darkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              view === 'calendar' 
                ? darkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar View
          </button>
        </div>

        {/* Action Buttons based on Role */}
        {userRole === 'event_manager' && (
          <button 
            onClick={openCreateEventPopup}
            className="mb-6 flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
          >
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
            <button onClick={openVenueRequestPopup} className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition">
              Manage Venue Requests
            </button>
            <button onClick={openEnableVenuePopup} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition">
              Enable Venues
            </button>
          </div>
        )}

        {/* Create Event Popup */}
        {showCreateEventPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{isEditMode ? 'Edit Event' : 'Create New Event'}</h2>
                <button 
                  onClick={closeEventPopup}
                  className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} text-2xl font-bold`}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Event Title */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={newEvent.eventName}
                    onChange={(e) => handleCreateEventInputChange('eventName', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter event title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Description *
                  </label>
                  <textarea
                    value={newEvent.about}
                    onChange={(e) => handleCreateEventInputChange('about', e.target.value)}
                    rows="4"
                    className={`w-full px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter event description"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => handleCreateEventInputChange('date', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => handleCreateEventInputChange('time', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={newEvent.time2}
                      onChange={(e) => handleCreateEventInputChange('time2', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>

                {/* Venue */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Venue *
                  </label>
                  <select
                    value={newEvent.venue}
                    onChange={(e) => handleCreateEventInputChange('venue', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select a venue</option>
                    {venueOptions.map(({ id, label, enabled }) => (
                      <option 
                        key={id} 
                        value={id}
                        disabled={!enabled || venueAvailability[id] === false}
                        className={!enabled || venueAvailability[id] === false ? 'text-gray-400' : ''}
                      >
                        {label} {(!enabled || venueAvailability[id] === false) ? '(Unavailable)' : ''}
                      </option>
                    ))}
                  </select>
                  {Object.keys(venueAvailability).length > 0 && (
                    <div className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p>Venue availability for selected date and time:</p>
                      <ul className="mt-1">
                        {venueOptions.map(({ id, label }) => (
                            <li key={id} className={venueAvailability[id] === false ? 'text-red-500' : 'text-green-500'}>
                              {label}: {venueAvailability[id] === false ? '❌ Unavailable' : '✅ Available'}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Capacity */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newEvent.participants}
                    onChange={(e) => handleCreateEventInputChange('participants', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter maximum capacity"
                  />
                </div>

                {/* Manager ID (read-only) */}
                <div>
                  <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Manager ID
                  </label>
                  <input
                    type="text"
                    value={userID}
                    readOnly
                    className={`w-full px-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-600 text-gray-400' 
                        : 'bg-gray-100 border-gray-300 text-gray-600'
                    } cursor-not-allowed`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={closeEventPopup}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={isEditMode ? handleUpdateEvent : handleCreateEvent}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    {isEditMode ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registration Management Popup */}
        {showRegistrationPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Manage Registration Requests</h2>
                <button 
                  onClick={() => setShowRegistrationPopup(false)}
                  className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} text-2xl font-bold`}
                >
                  ×
                </button>
              </div>
              
              {pendingRegistrations.length === 0 ? (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-center py-8`}>No pending registration requests.</p>
              ) : (
                <div className="space-y-4">
                  {pendingRegistrations.map((request) => (
                    <div 
                      key={request.registrationid} 
                      className={`${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200'} border rounded-lg p-4 hover:shadow-md transition`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            Registration ID: {request.registrationid}
                          </h3>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2`}>
                            <span className="font-medium">Student ID:</span> {request.studentid}
                          </p>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Event ID:</span> {request.eventid}
                          </p>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Date:</span> {request.date}
                          </p>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Time:</span> {request.time}
                          </p>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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

        {/* Venue Request Management Popup */}
        {showVenueRequestPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Manage Venue Requests</h2>
                <button
                  onClick={() => setShowVenueRequestPopup(false)}
                  className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} text-2xl font-bold`}
                >
                  ×
                </button>
              </div>

              {pendingVenueRequests.length === 0 ? (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-center py-8`}>No pending venue requests.</p>
              ) : (
                <div className="space-y-4">
                  {pendingVenueRequests.map((request) => {
                    const requestId = request.requestId || request.request_id || request.requestid || request.id;
                    return (
                      <div
                        key={requestId}
                        className={`${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200'} border rounded-lg p-4 hover:shadow-md transition`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              Request ID: {requestId}
                            </h3>
                            {(request.managerId || request.manager_id) && (
                              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2`}>
                                <span className="font-medium">Manager ID:</span> {request.managerId || request.manager_id}
                              </p>
                            )}
                            {(request.venueId || request.venue_id || request.venueid) && (
                              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <span className="font-medium">Venue ID:</span> {request.venueId || request.venue_id || request.venueid}
                              </p>
                            )}
                            {request.requestedTime && (
                              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <span className="font-medium">Requested Time:</span> {new Date(request.requestedTime).toLocaleString()}
                              </p>
                            )}
                            {request.managedBy !== undefined && (
                              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <span className="font-medium">Managed By:</span> {request.managedBy ?? '—'}
                              </p>
                            )}
                            {request.status && (
                              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <span className={`font-medium px-2 py-1 rounded text-sm ${
                                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  Status: {request.status}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleApproveVenueRequest(requestId)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyVenueRequest(requestId)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enable Venues Popup */}
        {showEnableVenuePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Enable/Disable Venues</h2>
                <button
                  onClick={() => setShowEnableVenuePopup(false)}
                  className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} text-2xl font-bold`}
                >
                  ×
                </button>
              </div>

              {venues.length === 0 ? (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-center py-8`}>No venues found.</p>
              ) : (
                <div className="space-y-4">
                  {venues.map((venue) => {
                    const venueId = venue.venueId || venue.venue_id || venue.id;
                    const venueName = venue.venueName || venue.venue_name || venue.name || `Venue ${venueId}`;
                    const venueCapacity = venue.venueCapacity || venue.venue_capacity || venue.capacity;
                    const isEnabled = venue.isEnabled || venue.is_enabled || venue.enabled;
                    
                    return (
                      <div
                        key={venueId}
                        className={`${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200'} border rounded-lg p-4 hover:shadow-md transition`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {venueName}
                            </h3>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1`}>
                              <span className="font-medium">Venue ID:</span> {venueId}
                            </p>
                            {venueCapacity && (
                              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                                <span className="font-medium">Capacity:</span> {venueCapacity}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <button
                              onClick={() => handleToggleVenue(venueId, isEnabled)}
                              className={`px-4 py-2 rounded-lg font-semibold transition ${
                                isEnabled 
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {isEnabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {view === 'list' ? (
            <div>
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>My Registered Events</h2>
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