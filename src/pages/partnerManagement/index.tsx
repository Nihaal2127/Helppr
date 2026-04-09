import { useState } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import SubscriptionPlans from "./subscriptionPlans/subscriptionPlans";
import PortfolioManagement from "./portfolioManagement/PortfolioManagement";
import PostManagement from "./postManagement/PostManagement";

const PartnerManagement = () => {
    const { register, setValue } = useForm<any>();

    const [selectedPage, setSelectedPage] = useState<string>("");

    const [cardList] = useState<string[]>([
        "Subscription\nPlans",
        "Portfolio\nManagement",
        "Post\nManagement",
    ]);

    const handleOnClick = (title: string) => {
        if (title === "Subscription\nPlans") {
            setSelectedPage("subscription");
        } 
        else if (title === "Portfolio\nManagement") {
            setSelectedPage("portfolio");
        }
        else if (title === "Post\nManagement") {
            setSelectedPage("post");
        }
    };

   
    if (selectedPage === "subscription") {
        return <SubscriptionPlans onBack={() => setSelectedPage("")} />;
    }

    if (selectedPage === "portfolio") {
        return <PortfolioManagement onBack={() => setSelectedPage("")} />;
    }
    
    if (selectedPage === "post") {
        return <PostManagement onBack={() => setSelectedPage("")} />;
    }
    return (
        <div className="main-page-content">
            <CustomHeader title="Partner Management" register={register} setValue={setValue} />

            <div className="custom-grid-box-div">
                {cardList.map((card, index) => (
                    <div
                        className="custom-grid-box"
                        key={index}
                        onClick={() => handleOnClick(card)}
                        style={{ cursor: "pointer", whiteSpace: "pre-line" }}
                    >
                        {card}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnerManagement;