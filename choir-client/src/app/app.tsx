import { Button } from '@/components/ui/button';

export function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8 text-slate-800">Choir Sync</h1>
      <Button onClick={() => alert('Tailwind and shadcn/ui work!')}>
        Click Me
      </Button>
    </div>
  );
}

export default App;
