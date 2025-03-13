import { useState } from "react";
import CustomHeader from "../../components/CustomHeader";
import { getNavigate, showLog } from "../../helper/utility";
import { ROUTES } from "../../routes/Routes";

const Financials = () => {
    const navigate = getNavigate();
    const [settingList] = useState<string[]>([
        "Order\nPayments", "Partner\nPayments",
    ]);

    const handleOnClick = (title: string) => {
        if (title == "Order\nPayments") {
            navigate?.(ROUTES.ORDER_PAYMENTS.path);
        }
        if (title == "Partner\nPayments") {
            navigate?.(ROUTES.PARTNER_PAYMENTS.path);
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