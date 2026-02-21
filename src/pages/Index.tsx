import { useState, useCallback } from "react";
import BootSequence from "@/components/BootSequence";
import TerminalCLI from "@/components/TerminalCLI";

const Index = () => {
  const [booted, setBooted] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
  }, []);

  if (!booted) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  return <TerminalCLI />;
};

export default Index;
