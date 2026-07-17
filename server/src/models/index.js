import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: String,
  lastName: { type: String, required: true },
  address: String,
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
});

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  qualification: { type: String, default: '' },
  available: { type: Boolean, default: true },
});

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  slot: { type: String, enum: ['morning', 'afternoon'], required: true },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now },
});

export const Patient = mongoose.model('Patient', patientSchema);
export const Doctor = mongoose.model('Doctor', doctorSchema);
export const Appointment = mongoose.model('Appointment', appointmentSchema);
