# Event Schedule System

A web-based event management platform for scheduling, managing, and registering for events. Built with React and designed for university event coordination.

## Team Members - Group 10

| Name | Student ID | Role |
|------|------------|------|
| Hew Wee Bo | 251UC250HB | Event Manager |
| Jeremy Puah Rui Zhe | 252UC253W6 | Student |
| Muhammad Nur Akmal Bin Ahmad Mokhtaza | 252UC254BP | On-site Manager |
| Shanjif Cakravrthi | 251UC250J7 | Administrator |

## Project Overview

This system solves the challenge of event management by providing a centralized platform where:
- Students and guests can easily browse and register for events
- Event managers can create schedules and allocate venues
- Administrators can manage registrations and send announcements
- On-site managers can approve venue requests and manage schedules

### Problem Statement

Event management faces challenges due to lack of scheduling systems, venue conflicts, and coordination issues. This platform provides:
- Real-time venue availability checking
- Automated clash detection for overlapping events
- Centralized approval workflows
- Efficient time and venue utilization

## Features

### For Students/Guests
- 📅 View all available events
- ✅ Register for events with one click
- 🔔 Clash detection to prevent double-booking
- 📱 View personal schedule of registered events
- 🗓️ Calendar and list view options

### For Event Managers
- ➕ Create and schedule new events
- 🏢 Allocate venues and check availability
- ✏️ Edit existing event details
- 📊 Manage event capacity

### For Administrators
- 📥 Export event history and reports
- 👥 Manage event registrations
- 📢 Send announcements to students
- 📈 View system-wide statistics

### For On-site Managers
- 👀 View complete venue schedules
- ✔️ Approve or reject venue requests
- 🔓 Enable venues for booking
- 📍 Manage venue availability periods

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository
```bash
git clone https://github.com/UnderscorePan/EventScheduler.git
cd EventScheduler
```

2. Install dependencies
```bash
npm install
```

3. Install required packages
```bash
npm install lucide-react date-fns
```

4. Start the development server
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## 🛠️ Technologies Used

- **Frontend Framework:** React.js
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **Backend (Planned):** Flask (Python)
- **Database (Planned):** PostgreSQL or SQLite

## 📁 Project Structure

```
event-schedule/
├── public/
│   └── index.html          # Main HTML file with Tailwind CDN
├── src/
│   ├── components/         # React components (to be added)
│   ├── App.js             # Main application component
│   ├── index.js           # React entry point
│   └── index.css          # Global styles
├── package.json           # Project dependencies
└── README.md             # Project documentation
```

## 👤 User Roles

The system supports four distinct user roles:

1. **Student/Guest** - Register for events and view schedules
2. **Event Manager** - Create and manage event schedules
3. **Administrator** - Oversee registrations and communications
4. **On-site Manager** - Control venue availability and approvals

## 🎯 Use Cases

- **EM-1:** Create Schedule
- **EM-2:** Allocate Venue/Space
- **AD-1:** Export Event History
- **AD-2:** Manage Registrations
- **AD-3:** Send Announcements
- **OSM-1:** View Schedule
- **OSM-2:** Enable Venue
- **OSM-3:** Manage Venue Requests
- **ST-1:** Register in Event
- **ST-2:** View Registered Schedule

## 📅 Project Timeline

Project development follows a structured schedule with milestones for:
- Requirements gathering and analysis
- System design and architecture
- Frontend development
- Backend integration
- Testing and deployment

## 🔜 Upcoming Features

- [ ] User authentication and login system
- [ ] Backend API integration with Flask
- [ ] Database implementation
- [ ] Email notifications for event updates
- [ ] Advanced filtering and search
- [ ] Mobile-responsive design improvements
- [ ] Event categories and tags
- [ ] Venue capacity visualization
- [ ] Export functionality for personal schedules

## 🤝 Contributing

This is an academic project developed by Group 10. For questions or suggestions, please contact the team members.

## 📝 License

This project is created for educational purposes as part of a university course assignment.

## 📞 Contact

For any queries regarding this project, please reach out to the team members listed above.

---

**Version:** 1.0  
**Last Updated:** December 2025  
**Course Project:** Schedule Management System