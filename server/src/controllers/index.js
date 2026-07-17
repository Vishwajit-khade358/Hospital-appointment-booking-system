import { Patient, Doctor, Appointment } from '../models/index.js';
import bcrypt from 'bcryptjs';

// --- Patient Controllers ---

export const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().select('-password');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPatient = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const patient = new Patient({ ...req.body, password: hashedPassword });
    await patient.save();
    res.status(201).json({ ...patient.toObject(), password: undefined });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePatient = async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    await Appointment.deleteMany({ patientId: req.params.id });
    res.json({ message: 'Patient deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginPatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ username: req.body.username });
    if (!patient || !(await bcrypt.compare(req.body.password, patient.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ ...patient.toObject(), password: undefined });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Doctor Controllers ---

export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const initializeDoctors = async () => {
  // Always reset doctors to the latest list
  await Doctor.deleteMany({});
  await Doctor.insertMany([
    { name: 'Dr. Amit Sharma',  specialization: 'Cardiologist',       qualification: 'MBBS, MD (Cardiology)',    available: true },
    { name: 'Dr. Neha Patil',   specialization: 'Dentist',             qualification: 'BDS, MDS',                 available: true },
    { name: 'Dr. Raj Mehta',    specialization: 'General Physician',   qualification: 'MBBS',                     available: true },
    { name: 'Dr. Sneha Joshi',  specialization: 'Dermatologist',       qualification: 'MBBS, MD (Dermatology)',   available: true },
    { name: 'Dr. Karan Verma',  specialization: 'Orthopedic Surgeon',  qualification: 'MBBS, MS (Orthopedics)',   available: true },
    { name: 'Dr. Priya Singh',  specialization: 'Gynecologist',        qualification: 'MBBS, MS (Gynecology)',    available: true },
  ]);
};

// Cleanup orphan appointments (patientId no longer exists)
export const cleanupOrphanAppointments = async (req, res) => {
  try {
    const patients = await Patient.find().select('_id');
    const validIds = patients.map(p => p._id);
    const result = await Appointment.deleteMany({ patientId: { $nin: validIds } });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Appointment Controllers ---

export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().populate('patientId doctorId');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
