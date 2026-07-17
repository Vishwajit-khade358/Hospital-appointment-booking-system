import express from 'express';
import * as ctrl from '../controllers/index.js';

const router = express.Router();

// Patient routes
router.get('/patients', ctrl.getPatients);
router.post('/patients', ctrl.createPatient);
router.put('/patients/:id', ctrl.updatePatient);
router.delete('/patients/:id', ctrl.deletePatient);
router.post('/patients/login', ctrl.loginPatient);

// Doctor routes
router.get('/doctors', ctrl.getDoctors);

router.delete('/appointments/cleanup', ctrl.cleanupOrphanAppointments);

// Appointment routes
router.get('/appointments', ctrl.getAppointments);
router.post('/appointments', ctrl.createAppointment);
router.put('/appointments/:id', ctrl.updateAppointment);

export default router;
