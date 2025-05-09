import { useState } from "react";
import CustomHeader from "../../components/CustomHeader";
import { ROUTES } from "../../routes/Routes";

const Financials = () => {
    const [settingList] = useState<string[]>([
        "Order\nPayments", "Partner\nPayments", "Partner\nPayout",
    ]);

    const handleOnClick = (title: string) => {
        if (title == "Order\nPayments") {
            window.open(ROUTES.ORDER_PAYMENTS.path, "_blank");
        }
        else if (title == "Partner\nPayments") {
            window.open(ROUTES.PARTNER_PAYMENTS.path, "_blank");
        }
        else if (title == "Partner\nPayout") {
            window.open(ROUTES.PARTNER_PAYOUT.path, "_blank");
        }
    }

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Financial"
                />

                <div className="custom-grid-box-div">
                    {settingList.map((setting, index) => (
                        <div
                            className="custom-grid-box"
                            key={index}
                            onClick={() => handleOnClick(setting)}
                        >
                            {setting}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default Financials;