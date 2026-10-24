/**
 * Emirates Airlines - Backend API Server
 * Complete REST API for flight booking, user management, and operations
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'emirates-secret-2026';
const SALT_ROUNDS = 12;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// ==================== MONGODB SCHEMAS ====================

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  skywardsId: { type: String, unique: true, sparse: true },
  skywardsTier: { type: String, enum: ['Blue', 'Silver', 'Gold', 'Platinum'], default: 'Blue' },
  skywardsMiles: { type: Number, default: 0 },
  nationality: { type: String },
  passportNumber: { type: String },
  passportExpiry: { type: Date },
  dateOfBirth: { type: Date },
  preferences: {
    seatPreference: { type: String, enum: ['Window', 'Aisle', 'Middle'], default: 'Window' },
    mealPreference: { type: String, default: 'Standard' },
    language: { type: String, default: 'en' }
  },
  createdAt: { type: Date, default: Date.now }
});

const flightSchema = new mongoose.Schema({
  flightNumber: { type: String, required: true, unique: true },
  aircraft: { type: String, default: 'Boeing 777-300ER' },
  origin: {
    code: { type: String, required: true },
    city: { type: String, required: true },
    airport: { type: String, required: true },
    country: { type: String, required: true }
  },
  destination: {
    code: { type: String, required: true },
    city: { type: String, required: true },
    airport: { type: String, required: true },
    country: { type: String, required: true }
  },
  departureTime: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  duration: { type: String, required: true },
  pricing: {
    economy: { type: Number, required: true },
    business: { type: Number, required: true },
    first: { type: Number, required: true }
  },
  seatsAvailable: {
    economy: { type: Number, default: 300 },
    business: { type: Number, default: 42 },
    first: { type: Number, default: 14 }
  },
  amenities: [{ type: String }],
  status: { type: String, enum: ['scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled'], default: 'scheduled' },
  operatingDays: [{ type: Number }], // 0-6 for Sun-Sat
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date }
});

const bookingSchema = new mongoose.Schema({
  bookingReference: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestEmail: { type: String },
  flights: [{
    flightNumber: String,
    flightDate: Date,
    origin: String,
    destination: String,
    departureTime: String,
    arrivalTime: String,
    cabinClass: { type: String, enum: ['economy', 'business', 'first'] },
    status: { type: String, default: 'confirmed' }
  }],
  passengers: [{
    title: String,
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    nationality: String,
    passportNumber: String,
    passportExpiry: Date,
    seatNumber: String,
    mealPreference: String,
    specialAssistance: [String]
  }],
  tripType: { type: String, enum: ['oneway', 'roundtrip', 'multicity'] },
  contact: {
    email: String,
    phone: String,
    countryCode: String
  },
  pricing: {
    baseFare: Number,
    taxes: Number,
    fees: Number,
    total: Number,
    currency: { type: String, default: 'USD' }
  },
  extras: {
    insurance: Boolean,
    loungeAccess: Boolean,
    priorityBoarding: Boolean,
    extraBaggage: Number
  },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  bookingStatus: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  checkedIn: { type: Boolean, default: false },
  boardingPasses: [{
    passengerName: String,
    flightNumber: String,
    seatNumber: String,
    gate: String,
    boardingTime: String,
    barcode: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  destination: { type: String },
  discountPercent: { type: Number },
  originalPrice: { type: Number },
  salePrice: { type: Number },
  cabinClass: { type: String },
  validFrom: { type: Date },
  validTo: { type: Date },
  promoCode: { type: String },
  terms: [{ type: String }],
  featured: { type: Boolean, default: false },
  category: { type: String, enum: ['destination', 'upgrade', 'package', 'seasonal'] }
});

const destinationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  airport: { type: String, required: true },
  region: { type: String },
  image: { type: String },
  description: { type: String },
  attractions: [{ type: String }],
  timezone: { type: String },
  popular: { type: Boolean, default: false }
});

// Models
const User = mongoose.model('User', userSchema);
const Flight = mongoose.model('Flight', flightSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Offer = mongoose.model('Offer', offerSchema);
const Destination = mongoose.model('Destination', destinationSchema);

// ==================== DATABASE CONNECTION ====================

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emirates_db')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

// ==================== HELPER FUNCTIONS ====================

const generateBookingRef = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  for (let i = 0; i < 6; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
  return ref;
};

const generateSkywardsId = () => {
  return 'EK' + Math.floor(100000000 + Math.random() * 900000000);
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};

const getDateRange = (dateStr) => {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

// ==================== AUTH ENDPOINTS ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const skywardsId = generateSkywardsId();
    
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      skywardsId,
      skywardsMiles: 2500 // Welcome bonus
    });
    
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      success: true,
      message: 'Welcome to Emirates Skywards!',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          skywardsId: user.skywardsId,
          skywardsTier: user.skywardsTier,
          skywardsMiles: user.skywardsMiles
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          skywardsId: user.skywardsId,
          skywardsTier: user.skywardsTier,
          skywardsMiles: user.skywardsMiles
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    delete updates.skywardsId;
    delete updates.skywardsMiles;
    
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== FLIGHT SEARCH ENDPOINTS ====================

// Search flights
app.post('/api/flights/search', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, passengers, cabinClass, tripType } = req.body;
    
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ success: false, message: 'Origin, destination, and date required' });
    }
    
    // Find outbound flights
    const outboundFlights = await Flight.find({
      'origin.code': origin.toUpperCase(),
      'destination.code': destination.toUpperCase(),
      status: { $in: ['scheduled', 'delayed'] }
    }).sort({ departureTime: 1 });
    
    let returnFlights = [];
    if (tripType === 'roundtrip' && returnDate) {
      returnFlights = await Flight.find({
        'origin.code': destination.toUpperCase(),
        'destination.code': origin.toUpperCase(),
        status: { $in: ['scheduled', 'delayed'] }
      }).sort({ departureTime: 1 });
    }
    
    // Add date and pricing info
    const processFlights = (flights, date) => {
      return flights.map(f => ({
        ...f.toObject(),
        flightDate: date,
        availableSeats: f.seatsAvailable[cabinClass || 'economy'],
        price: f.pricing[cabinClass || 'economy'],
        totalPrice: f.pricing[cabinClass || 'economy'] * (passengers?.adults || 1)
      }));
    };
    
    res.json({
      success: true,
      data: {
        outbound: processFlights(outboundFlights, departureDate),
        return: processFlights(returnFlights, returnDate),
        searchParams: { origin, destination, departureDate, returnDate, passengers, cabinClass, tripType }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get flight details
app.get('/api/flights/:flightNumber', async (req, res) => {
  try {
    const flight = await Flight.findOne({ flightNumber: req.params.flightNumber.toUpperCase() });
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found' });
    }
    res.json({ success: true, data: flight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all flights
app.get('/api/flights', async (req, res) => {
  try {
    const { origin, destination, status } = req.query;
    let query = {};
    
    if (origin) query['origin.code'] = origin.toUpperCase();
    if (destination) query['destination.code'] = destination.toUpperCase();
    if (status) query.status = status;
    
    const flights = await Flight.find(query).sort({ flightNumber: 1 });
    res.json({ success: true, data: flights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get flight status
app.get('/api/flights/:flightNumber/status', async (req, res) => {
  try {
    const flight = await Flight.findOne({ flightNumber: req.params.flightNumber.toUpperCase() });
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found' });
    }
    
    res.json({
      success: true,
      data: {
        flightNumber: flight.flightNumber,
        status: flight.status,
        origin: flight.origin,
        destination: flight.destination,
        scheduledDeparture: flight.departureTime,
        scheduledArrival: flight.arrivalTime,
        aircraft: flight.aircraft
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== BOOKING ENDPOINTS ====================

// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { flights, passengers, contact, cabinClass, tripType, extras, userId } = req.body;
    
    if (!flights || !passengers || !contact) {
      return res.status(400).json({ success: false, message: 'Missing required booking information' });
    }
    
    // Generate unique booking reference
    let bookingReference;
    let exists = true;
    while (exists) {
      bookingReference = generateBookingRef();
      exists = await Booking.findOne({ bookingReference });
    }
    
    // Calculate pricing
    let baseFare = 0;
    for (const flightData of flights) {
      const flight = await Flight.findOne({ flightNumber: flightData.flightNumber });
      if (flight) {
        baseFare += flight.pricing[cabinClass || 'economy'] * passengers.length;
      }
    }
    
    const taxes = Math.round(baseFare * 0.12);
    const fees = 35;
    const total = baseFare + taxes + fees;
    
    const booking = new Booking({
      bookingReference,
      userId,
      guestEmail: contact.email,
      flights: flights.map(f => ({
        ...f,
        cabinClass: cabinClass || 'economy',
        status: 'confirmed'
      })),
      passengers,
      tripType: tripType || 'oneway',
      contact,
      pricing: { baseFare, taxes, fees, total },
      extras: extras || {},
      paymentStatus: 'completed',
      bookingStatus: 'confirmed'
    });
    
    await booking.save();
    
    // Award miles if user is logged in
    if (userId) {
      const miles = Math.round(total * 1.5);
      await User.findByIdAndUpdate(userId, { $inc: { skywardsMiles: miles } });
    }
    
    res.status(201).json({
      success: true,
      message: 'Booking confirmed!',
      data: {
        bookingReference,
        flights: booking.flights,
        passengers: booking.passengers,
        pricing: booking.pricing,
        contact: booking.contact
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get booking by reference
app.get('/api/bookings/:reference', async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      bookingReference: req.params.reference.toUpperCase() 
    });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user bookings
app.get('/api/bookings/user/:userId', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update booking (add services, change seats)
app.put('/api/bookings/:reference', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { bookingReference: req.params.reference.toUpperCase() },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel booking
app.delete('/api/bookings/:reference', async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingReference: req.params.reference.toUpperCase() });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    booking.bookingStatus = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();
    
    res.json({ success: true, message: 'Booking cancelled. Refund will be processed within 5-7 business days.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CHECK-IN ENDPOINTS ====================

// Online check-in
app.post('/api/checkin', async (req, res) => {
  try {
    const { bookingReference, lastName, passportNumber } = req.body;
    
    const booking = await Booking.findOne({ 
      bookingReference: bookingReference.toUpperCase(),
      'passengers.lastName': { $regex: new RegExp(lastName, 'i') }
    });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found. Please verify your details.' });
    }
    
    if (booking.checkedIn) {
      return res.status(400).json({ success: false, message: 'Already checked in' });
    }
    
    // Generate boarding passes
    const boardingPasses = booking.passengers.map((passenger, idx) => ({
      passengerName: `${passenger.firstName} ${passenger.lastName}`,
      flightNumber: booking.flights[0].flightNumber,
      seatNumber: passenger.seatNumber || `${Math.floor(Math.random() * 40) + 1}${['A', 'B', 'C', 'D', 'E', 'F'][idx % 6]}`,
      gate: `${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 20) + 1}`,
      boardingTime: booking.flights[0].departureTime,
      barcode: `${bookingReference}${Date.now().toString(36).toUpperCase()}`
    }));
    
    booking.checkedIn = true;
    booking.boardingPasses = boardingPasses;
    await booking.save();
    
    res.json({
      success: true,
      message: 'Check-in successful!',
      data: {
        bookingReference: booking.bookingReference,
        boardingPasses
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get available seats for seat selection
app.get('/api/flights/:flightNumber/seats', async (req, res) => {
  try {
    const { cabinClass } = req.query;
    
    // Generate seat map
    const seatConfig = {
      economy: { rows: 40, cols: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'], startRow: 20 },
      business: { rows: 7, cols: ['A', 'C', 'D', 'G', 'H', 'K'], startRow: 8 },
      first: { rows: 4, cols: ['A', 'E', 'F', 'K'], startRow: 1 }
    };
    
    const config = seatConfig[cabinClass || 'economy'];
    const seats = [];
    
    for (let row = config.startRow; row < config.startRow + config.rows; row++) {
      for (const col of config.cols) {
        seats.push({
          seatNumber: `${row}${col}`,
          available: Math.random() > 0.3,
          type: ['A', 'K'].includes(col) ? 'window' : ['D', 'G', 'E', 'F'].includes(col) ? 'aisle' : 'middle',
          extraLegroom: row === config.startRow || row === config.startRow + Math.floor(config.rows / 2)
        });
      }
    }
    
    res.json({ success: true, data: { cabinClass, seats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DESTINATIONS & OFFERS ====================

// Get destinations
app.get('/api/destinations', async (req, res) => {
  try {
    const { popular, region } = req.query;
    let query = {};
    
    if (popular === 'true') query.popular = true;
    if (region) query.region = region;
    
    const destinations = await Destination.find(query).sort({ city: 1 });
    res.json({ success: true, data: destinations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get offers
app.get('/api/offers', async (req, res) => {
  try {
    const { featured, category } = req.query;
    let query = { validTo: { $gte: new Date() } };
    
    if (featured === 'true') query.featured = true;
    if (category) query.category = category;
    
    const offers = await Offer.find(query).sort({ featured: -1, validTo: 1 });
    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SEED DATA ====================

app.post('/api/seed', async (req, res) => {
  try {
    // Clear data
    await Promise.all([
      User.deleteMany({}),
      Flight.deleteMany({}),
      Booking.deleteMany({}),
      Offer.deleteMany({}),
      Destination.deleteMany({})
    ]);
    
    // Create demo user
    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
    await User.create({
      email: 'demo@emirates.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Traveler',
      phone: '+1234567890',
      skywardsId: 'EK123456789',
      skywardsTier: 'Gold',
      skywardsMiles: 45000
    });
    
    // Create destinations
    const destinations = [
      { code: 'DXB', city: 'Dubai', country: 'UAE', airport: 'Dubai International Airport', region: 'Middle East', popular: true },
      { code: 'LHR', city: 'London', country: 'United Kingdom', airport: 'Heathrow Airport', region: 'Europe', popular: true },
      { code: 'JFK', city: 'New York', country: 'USA', airport: 'John F. Kennedy International', region: 'Americas', popular: true },
      { code: 'SIN', city: 'Singapore', country: 'Singapore', airport: 'Changi Airport', region: 'Asia Pacific', popular: true },
      { code: 'SYD', city: 'Sydney', country: 'Australia', airport: 'Sydney Airport', region: 'Asia Pacific', popular: true },
      { code: 'CDG', city: 'Paris', country: 'France', airport: 'Charles de Gaulle Airport', region: 'Europe', popular: true },
      { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', airport: 'Hong Kong International', region: 'Asia Pacific', popular: true },
      { code: 'BKK', city: 'Bangkok', country: 'Thailand', airport: 'Suvarnabhumi Airport', region: 'Asia Pacific', popular: true },
      { code: 'KHI', city: 'Karachi', country: 'Pakistan', airport: 'Jinnah International', region: 'Asia', popular: false },
      { code: 'LHE', city: 'Lahore', country: 'Pakistan', airport: 'Allama Iqbal International', region: 'Asia', popular: false },
      { code: 'ISB', city: 'Islamabad', country: 'Pakistan', airport: 'Islamabad International', region: 'Asia', popular: false }
    ];
    await Destination.insertMany(destinations);
    
    // Create flights
    const flights = [
      // Dubai routes
      { flightNumber: 'EK001', aircraft: 'Airbus A380-800', origin: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, destination: { code: 'LHR', city: 'London', airport: 'Heathrow', country: 'UK' }, departureTime: '07:30', arrivalTime: '12:15', duration: '7h 45m', pricing: { economy: 650, business: 3200, first: 8500 }, seatsAvailable: { economy: 380, business: 76, first: 14 }, amenities: ['WiFi', 'IFE', 'Onboard Lounge', 'Shower Spa'] },
      { flightNumber: 'EK002', aircraft: 'Airbus A380-800', origin: { code: 'LHR', city: 'London', airport: 'Heathrow', country: 'UK' }, destination: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, departureTime: '21:30', arrivalTime: '08:15', duration: '6h 45m', pricing: { economy: 650, business: 3200, first: 8500 }, seatsAvailable: { economy: 380, business: 76, first: 14 }, amenities: ['WiFi', 'IFE', 'Onboard Lounge', 'Shower Spa'] },
      { flightNumber: 'EK201', aircraft: 'Boeing 777-300ER', origin: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, destination: { code: 'JFK', city: 'New York', airport: 'JFK International', country: 'USA' }, departureTime: '03:00', arrivalTime: '09:05', duration: '14h 05m', pricing: { economy: 890, business: 5500, first: 15000 }, seatsAvailable: { economy: 304, business: 42, first: 8 }, amenities: ['WiFi', 'IFE', 'Premium Economy'] },
      { flightNumber: 'EK351', aircraft: 'Boeing 777-300ER', origin: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, destination: { code: 'SIN', city: 'Singapore', airport: 'Changi', country: 'Singapore' }, departureTime: '09:45', arrivalTime: '21:00', duration: '7h 15m', pricing: { economy: 520, business: 2800, first: 7200 }, seatsAvailable: { economy: 304, business: 42, first: 8 }, amenities: ['WiFi', 'IFE'] },
      { flightNumber: 'EK412', aircraft: 'Airbus A380-800', origin: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, destination: { code: 'SYD', city: 'Sydney', airport: 'Sydney Airport', country: 'Australia' }, departureTime: '22:00', arrivalTime: '17:40', duration: '14h 40m', pricing: { economy: 1100, business: 6200, first: 18000 }, seatsAvailable: { economy: 380, business: 76, first: 14 }, amenities: ['WiFi', 'IFE', 'Onboard Lounge', 'Shower Spa'] },
      { flightNumber: 'EK073', aircraft: 'Boeing 777-300ER', origin: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, destination: { code: 'CDG', city: 'Paris', airport: 'Charles de Gaulle', country: 'France' }, departureTime: '14:45', arrivalTime: '19:30', duration: '7h 45m', pricing: { economy: 580, business: 2900, first: 7800 }, seatsAvailable: { economy: 304, business: 42, first: 8 }, amenities: ['WiFi', 'IFE'] },
      // Pakistan routes
      { flightNumber: 'EK600', aircraft: 'Boeing 777-300ER', origin: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, destination: { code: 'KHI', city: 'Karachi', airport: 'Jinnah International', country: 'Pakistan' }, departureTime: '10:15', arrivalTime: '14:30', duration: '2h 15m', pricing: { economy: 280, business: 1200, first: 3500 }, seatsAvailable: { economy: 304, business: 42, first: 8 }, amenities: ['WiFi', 'IFE'] },
      { flightNumber: 'EK601', aircraft: 'Boeing 777-300ER', origin: { code: 'KHI', city: 'Karachi', airport: 'Jinnah International', country: 'Pakistan' }, destination: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, departureTime: '16:00', arrivalTime: '18:15', duration: '2h 15m', pricing: { economy: 280, business: 1200, first: 3500 }, seatsAvailable: { economy: 304, business: 42, first: 8 }, amenities: ['WiFi', 'IFE'] },
      { flightNumber: 'EK622', aircraft: 'Boeing 777-200LR', origin: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, destination: { code: 'LHE', city: 'Lahore', airport: 'Allama Iqbal International', country: 'Pakistan' }, departureTime: '04:00', arrivalTime: '08:30', duration: '2h 30m', pricing: { economy: 320, business: 1400, first: 4000 }, seatsAvailable: { economy: 228, business: 35, first: 8 }, amenities: ['WiFi', 'IFE'] },
      { flightNumber: 'EK623', aircraft: 'Boeing 777-200LR', origin: { code: 'LHE', city: 'Lahore', airport: 'Allama Iqbal International', country: 'Pakistan' }, destination: { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' }, departureTime: '10:00', arrivalTime: '12:30', duration: '2h 30m', pricing: { economy: 320, business: 1400, first: 4000 }, seatsAvailable: { economy: 228, business: 35, first: 8 }, amenities: ['WiFi', 'IFE'] }
    ];
    await Flight.insertMany(flights);
    
    // Create offers
    const offers = [
      { title: 'Dubai Shopping Festival', description: 'Experience the world\'s greatest shopping festival with special fares to Dubai', destination: 'Dubai', discountPercent: 20, salePrice: 450, originalPrice: 650, cabinClass: 'economy', validFrom: new Date(), validTo: new Date(Date.now() + 30*24*60*60*1000), promoCode: 'DSF2026', featured: true, category: 'seasonal' },
      { title: 'Business Class Upgrade', description: 'Upgrade to Business Class for 50% off on select routes', discountPercent: 50, cabinClass: 'business', validFrom: new Date(), validTo: new Date(Date.now() + 14*24*60*60*1000), promoCode: 'BIZ50', featured: true, category: 'upgrade' },
      { title: 'London Calling', description: 'Special fares to London starting from $599', destination: 'London', salePrice: 599, originalPrice: 750, cabinClass: 'economy', validFrom: new Date(), validTo: new Date(Date.now() + 45*24*60*60*1000), promoCode: 'LONDON599', featured: false, category: 'destination' },
      { title: 'Family Package to Singapore', description: 'Kids fly free on economy bookings to Singapore', destination: 'Singapore', discountPercent: 100, cabinClass: 'economy', validFrom: new Date(), validTo: new Date(Date.now() + 60*24*60*60*1000), promoCode: 'FAMILYSIN', featured: true, category: 'package' }
    ];
    await Offer.insertMany(offers);
    
    res.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        users: 1,
        destinations: destinations.length,
        flights: flights.length,
        offers: offers.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Emirates API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✈️  Emirates API Server running on http://localhost:${PORT}\n`);
});

module.exports = app;
