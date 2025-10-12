import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";

export default function LogoutButton({ variant = "outlined", children = "Logout", ...props }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();                 // clears server session + localStorage
    navigate("/signin", { replace: true });  // send back to sign-in
  };

  return (
    <Button variant={variant} onClick={handleLogout} {...props}>
      {children}
    </Button>
  );
}
