import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import Pvc from "./components/PvcSection/Pvc";
import Pvp from "./components/PvcSection/Pvp";

import "./App.css";




export function App() {

  return (
    
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/pvc/*" element={<Pvc />} />
              <Route path="/pvp/*" element={<Pvp />} />
            </Routes>
          </Router>
        
    
  );
}

export default App;
