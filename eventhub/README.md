# EventHub - Event Management (Bootstrap + JavaScript + Firebase)

Roles: **Admin** (analytics, events, students, registrations) and **Student** (sign up, browse, register, dashboard, profile).

## Setup (5 steps)
1. Firebase Console > **Authentication** > Sign-in method > enable **Email/Password**.
2. Firebase Console > **Firestore Database** > create database.
3. Firestore > **Rules** > paste `firestore.rules` > Publish.
4. **Create the admin manually**
   - Authentication > Users > Add user (email + password). Copy the **User UID**.
   - Firestore > start collection `users` > Document ID = that UID, fields:
     `name` (string), `email` (string), `role` = `admin` (string), `status` = `active` (string)
5. Run on a local server (ES modules do not work from file://):
   - VS Code "Live Server", or `python -m http.server 5500` then open http://localhost:5500
   - For hosting: Authentication > Settings > Authorized domains > add your domain.

Log in at `index.html` - admins go to admin.html, students to student.html automatically.

## Duplicate protection
- **Email**: Firebase Auth rejects duplicates.
- **Roll number**: `rollNumbers/{ROLL}` doc created inside a transaction; rules allow create only once.
- **Registration**: doc id `eventId_uid`, so a student cannot register twice for one event.
- Form validation on signup (name, email, roll, mobile, department, password) and on event forms.

## Notes
- Removing a student in the admin panel deletes their profile, registrations and frees the roll number, and they can no longer log in. Their Auth login record can be deleted in Firebase Console > Authentication (client code cannot delete other users).
- Firebase web API keys are public by design. Security comes from `firestore.rules`.
