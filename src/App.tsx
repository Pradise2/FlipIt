import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import Pvc from "./components/PvcSection/Pvc";
import "./App.css";

export function App() {

  return (
   <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/pvc/*" element={<Pvc />} />
            </Routes>
          </Router>
  );
}

export default App;
