// Uncomment this line to use CSS modules
// import styles from './app.module.css';
import NxWelcome from "./nx-welcome";

export function App() {
  return (
    <div>
      <NxWelcome title="choir-client"/>
    </div>
  );
}

export default App;


import { CreateSongSchema } from '@choir-workspace/shared-validation';
console.log(CreateSongSchema);
