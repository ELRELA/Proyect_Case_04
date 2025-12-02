require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: 'secret_key_pro',
  resave: false, saveUninitialized: false,
  cookie: { secure: false, maxAge: 3600000 }
}));

// CONEXIÓN MONGO
const uri = "mongodb+srv://sebastian2781241_db_user:SqUQK2c0vMWkz3bP@clustersm.dqai0ex.mongodb.net/CaseDatabase?appName=ClusterSM";

mongoose.connect(uri).then(() => console.log('✅ Servidor V3 Listo')).catch(err => console.error(err));

// --- MODELOS ---
const User = mongoose.model('users', new mongoose.Schema({
  name: String, last_name: String, dni: {type:String, unique:true},
  email: {type:String, unique:true}, phone: String, password: String,
  roles: [{type:String, enum:['rider','driver']}]
}));

// ACTUALIZADO: Agregamos 'plate' (Placa)
const Vehicle = mongoose.model('vehicles', new mongoose.Schema({
  owner_id: {type: mongoose.Schema.Types.ObjectId, ref:'users'},
  model: String, 
  plate: String, // <--- IMPORTANTE
  year: Number, 
  type: {type:String, enum:['car','motorbike','bicycle']},
  license_c: String, license_m: String
}));

const Trip = mongoose.model('trips', new mongoose.Schema({
  rider_id: {type: mongoose.Schema.Types.ObjectId, ref:'users'},
  driver_id: {type: mongoose.Schema.Types.ObjectId, ref:'users', default:null},
  vehicle_id: {type: mongoose.Schema.Types.ObjectId, ref:'vehicles', default:null},
  start_location: String, end_location: String, status: {type:String, default:'requested'},
  payment: { amount: Number, payment_method: String },
  detail_trip: { rating: Number, comments: String }
}));

// --- RUTAS ---

// Registro (Usuario + Auto opcional)
app.post('/api/register', async (req, res) => {
  try {
    const user = new User(req.body.user);
    await user.save();
    if (user.roles.includes('driver') && req.body.vehicle) {
      // Guardamos placa también
      await new Vehicle({ ...req.body.vehicle, owner_id: user._id }).save();
    }
    req.session.user = user;
    res.json({ success: true, user });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email, password: req.body.password });
  if(user) {
    req.session.user = user;
    res.json({ success: true, role: user.roles.includes('driver') ? 'driver' : 'rider' });
  } else res.status(401).json({ success: false, message: "Error credenciales" });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({success:true}); });
app.get('/api/session', (req, res) => res.json({ loggedIn: !!req.session.user, user: req.session.user }));

// GESTIÓN DE VEHÍCULOS
// Devuelve TODOS los vehículos del conductor (Lista)
app.get('/api/vehicles/my', async (req, res) => {
  if(!req.session.user) return res.status(403);
  const vehicles = await Vehicle.find({ owner_id: req.session.user._id });
  res.json(vehicles);
});

// Guardar nuevo vehículo
app.post('/api/vehicles', async (req, res) => {
  if(!req.session.user) return res.status(403);
  const v = new Vehicle({ ...req.body, owner_id: req.session.user._id });
  await v.save();
  res.json(v);
});

// VIAJES
app.get('/api/trips', async (req, res) => {
  if(!req.session.user) return res.status(403);
  const filter = req.query.status ? { status: req.query.status } : {};
  const trips = await Trip.find(filter)
    .populate('rider_id')
    .populate('driver_id')
    .populate('vehicle_id') // Para ver la placa y modelo
    .sort({ _id: -1 });
  res.json(trips);
});

app.post('/api/trips', async (req, res) => {
  const t = new Trip(req.body); await t.save(); res.json(t);
});

app.put('/api/trips/:id', async (req, res) => {
  const updated = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// ACEPTAR VIAJE CON VEHÍCULO SELECCIONADO
app.put('/api/trips/:id/accept', async (req, res) => {
  if(!req.session.user) return res.status(403);
  const { vehicle_id } = req.body; // El conductor nos dice qué auto usa

  if(!vehicle_id) return res.status(400).json({error: "Debes seleccionar un vehículo"});

  const updated = await Trip.findByIdAndUpdate(req.params.id, {
    driver_id: req.session.user._id,
    vehicle_id: vehicle_id,
    status: 'ongoing'
  }, { new: true });
  
  res.json(updated);
});

// Usar el puerto que nos da la nube O el 3000 si estamos en casa
const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});