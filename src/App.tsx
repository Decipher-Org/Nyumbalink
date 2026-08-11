import { BrowserRouter, Route, Routes } from "react-router-dom";

import Landing from "@/routes/Landing";
import ChooseRole from "@/routes/ChooseRole";
import SignupDetails from "@/routes/SignupDetails";
import Browse from "@/routes/Browse";
import Login from "@/routes/Login";
import { StubPage } from "@/routes/StubPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* /signup is always the chooser — never a form. SignupDetails bounces
            back here when it lacks a valid role. */}
        <Route path="/signup" element={<ChooseRole />} />
        <Route path="/signup/details" element={<SignupDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/browse" element={<Browse />} />
        <Route
          path="*"
          element={
            <StubPage
              title="Page not found"
              body="That page doesn't exist yet. It may be part of a milestone still in progress."
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
