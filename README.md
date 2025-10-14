# C.A.L.M Space - Mental Wellness Companion

C.A.L.M Space is a comprehensive mobile application designed to be your personal mental wellness companion. It offers a variety of tools and resources to help you manage stress, practice mindfulness, and connect with supportive communities.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Available Scripts](#available-scripts)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- **AI-Powered Chatbot:** Engage in supportive conversations with an AI chatbot designed to provide a listening ear and helpful resources.
- **Mood Tracking & Journaling:** Keep a record of your daily moods and write journal entries to reflect on your thoughts and feelings.
- **Guided Breathing Exercises:** Access guided breathing exercises to help you relax and manage moments of stress or anxiety.
- **Focus and Grounding Tools:** Utilize tools designed to improve focus and help you stay grounded in the present moment.
- **Creative Space:** Express yourself through creative outlets like mandala coloring and doodling.
- **Personalized Mood Playlists:** Listen to curated music playlists that adapt to your current mood.
- **Emergency Contact Access:** Quickly access your designated emergency contacts when you need immediate support.
- **Peer & Expert Connection:** Connect with a community of peers and mental health experts for additional support and guidance.

## Tech Stack

- **Framework:** [Expo](https://expo.dev/) (React Native)
- **UI:** [React Native Paper](https://reactnativepaper.com/), [React Native Skia](https://shopify.github.io/react-native-skia/)
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/)
- **State Management:** [React Query](https://tanstack.com/query/latest)
- **Backend:** [Supabase](https://supabase.io/)
- **Audio/Video:** [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)
- **Local Storage:** [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/calm-space.git
   ```
2. Navigate to the project directory:
   ```bash
   cd calm-space
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

## Available Scripts

In the project directory, you can run the following commands:

- `npm start`: Runs the app in development mode using Expo.
- `npm run android`: Opens the app on a connected Android device or emulator.
- `npm run ios`: Opens the app on the iOS simulator (macOS only).
- `npm run web`: Runs the app in a web browser.
- `npm run lint`: Lints the project files using ESLint.

## File Structure

```
.
├── app/              # Main application code, structured by routes
│   ├── admin/
│   ├── expert/
<!-- │   ├── peer/ -->
│   └── student/
├── assets/           # Images, fonts, and other static assets
├── components/       # Reusable UI components
├── constants/        # Global styles, colors, and other constants
├── lib/              # Helper functions and libraries
├── providers/        # React context providers
└── scripts/          # Additional scripts for development
```
 <!--  -->
## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

## Contact

For any questions or inquiries, please email [calmspaces@sgtuniversity.org](mailto:calmspaces@sgtuniversity.org).
