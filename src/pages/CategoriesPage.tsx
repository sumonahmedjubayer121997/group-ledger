import { useNavigate } from "react-router-dom";
import { CategoryManagement } from "@/components/CategoryManagement";
import { PageHeader } from "@/components/PageHeader";

const CategoriesPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Categories" description="The labels you use for expenses. Add your own alongside the defaults." />
      <CategoryManagement isOpen onClose={() => navigate("/")} />
    </>
  );
};

export default CategoriesPage;
