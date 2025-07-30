import { UserProfile } from "@/components/UserProfile";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  return <UserProfile onClose={handleClose} />;
};

export default ProfilePage;