# ✈️ Emirates Airlines Website

A comprehensive, professional Emirates Airlines website with full booking functionality, user authentication, and modern responsive design.

## 🌟 Features

### Customer Features
- ✈️ **Flight Search & Booking** - Search flights, select cabin class, book tickets
- 📱 **Online Check-in** - Check in 48 hours before departure, get digital boarding pass
- 📋 **Manage Booking** - View, modify, or cancel reservations
- 🔐 **User Authentication** - Register, login, secure sessions with JWT
- 🏆 **Emirates Skywards** - Loyalty program with miles tracking
- 📱 **Responsive Design** - Works perfectly on mobile, tablet, and desktop

### Technical Features
- RESTful API with 20+ endpoints
- MongoDB database with Mongoose ODM
- bcrypt password hashing
- JWT token authentication
- Modern luxury UI design
- WCAG accessibility considerations

## 📁 Project Structure

```
emirates-website/
├── backend/
│   ├── server.js      # Express API server (all endpoints)
│   ├── package.json   # Node dependencies
│   └── .env          # Environment configuration
│
├── frontend/
│   ├── index.html           # Homepage with booking form
│   ├── login.html           # User login page
│   ├── register.html        # Skywards registration
│   ├── dashboard.html       # User account dashboard
│   ├── flights.html         # Flight search results
│   ├── checkin.html         # Online check-in flow
│   └── manage-booking.html  # Booking management
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16 or higher
- MongoDB 4.4 or higher
- npm or yarn

### Installation Steps

**1. Install backend dependencies:**
```bash
cd backend
npm install
```

**2. Start MongoDB:**
```bash
# macOS with Homebrew
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

**3. Start the server:**
```bash
cd backend
npm start
```
Server runs at: http://localhost:3000

**4. Seed the database with sample data:**
```bash
curl -X POST http://localhost:3000/api/seed
```

**5. Open the frontend:**
- Simply open `frontend/index.html` in your browser
- Or use a local server for better experience:
```bash
# Using Python
cd frontend && python -m http.server 8080

# Using Node.js
npx serve frontend -p 8080
```

## 🔑 Demo Credentials

| Account Type | Email | Password |
|-------------|-------|----------|
| Demo User | demo@emirates.com | password123 |

You can also create a new account through the registration page.

## 🛫 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new Skywards account |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile` | Get user profile (auth required) |
| PUT | `/api/auth/profile` | Update profile (auth required) |

### Flights
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/flights/search` | Search available flights |
| GET | `/api/flights` | Get all flights |
| GET | `/api/flights/:number` | Get flight details |
| GET | `/api/flights/:number/status` | Get flight status |
| GET | `/api/flights/:number/seats` | Get seat map |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create new booking |
| GET | `/api/bookings/:reference` | Get booking by reference |
| GET | `/api/bookings/user/:userId` | Get user's bookings (auth required) |
| PUT | `/api/bookings/:reference` | Update booking |
| DELETE | `/api/bookings/:reference` | Cancel booking |

### Check-in
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkin` | Online check-in |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/destinations` | Get all destinations |
| GET | `/api/offers` | Get current offers |
| POST | `/api/seed` | Seed database with sample data |
| GET | `/api/health` | Health check |

## 🎨 Design System

### Colors
- **Emirates Red:** #D71921
- **Gold:** #C9A961
- **Charcoal:** #1A1A1A
- **White:** #FFFFFF

### Typography
- **Display:** Playfair Display (elegant serif)
- **Body:** Source Sans 3 (clean sans-serif)

### Design Principles
- Luxury & refined aesthetic
- Clean, uncluttered layouts
- Smooth animations
- Mobile-first responsive design
- Accessible color contrast

## 📱 Pages Overview

### Homepage (index.html)
- Hero section with flight search
- Popular destinations grid
- Special offers carousel
- Cabin class showcase
- Full footer with links

### Login (login.html)
- Split-screen design
- Email/password authentication
- Social login buttons (UI only)
- Forgot password link

### Register (register.html)
- Skywards signup form
- Welcome miles bonus display
- Terms acceptance
- Password validation

### Dashboard (dashboard.html)
- Miles balance card
- Tier progress tracker
- Upcoming trips
- Quick action buttons
- Miles activity history

### Flights (flights.html)
- Search results display
- Filter sidebar
- Sort options
- Flight cards with pricing
- Select flight action

### Check-in (checkin.html)
- 3-step process
- Booking lookup
- Passenger confirmation
- Digital boarding pass

### Manage Booking (manage-booking.html)
- Booking search
- Flight details display
- Passenger list
- Pricing summary
- Action buttons (change, cancel)

## 🔧 Environment Variables

Create a `.env` file in the backend folder:

```env
MONGODB_URI=mongodb://localhost:27017/emirates_db
PORT=3000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

## 🧪 Testing the API

```bash
# Health check
curl http://localhost:3000/api/health

# Seed database
curl -X POST http://localhost:3000/api/seed

# Search flights
curl -X POST http://localhost:3000/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{"origin":"DXB","destination":"LHR","departureDate":"2026-02-01"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@emirates.com","password":"password123"}'
```

## 🌐 Available Routes

| Route | Airport | City |
|-------|---------|------|
| DXB | Dubai International | Dubai |
| LHR | Heathrow | London |
| JFK | John F. Kennedy | New York |
| CDG | Charles de Gaulle | Paris |
| SIN | Changi | Singapore |
| SYD | Sydney Airport | Sydney |
| HKG | Hong Kong International | Hong Kong |
| BKK | Suvarnabhumi | Bangkok |
| KHI | Jinnah International | Karachi |
| LHE | Allama Iqbal International | Lahore |

## 📝 License

This project is for educational purposes only. Emirates is a trademark of Emirates Group.

---

**Fly Better with Emirates** ✈️
