import { useState } from "react";
import CustomHeader from "../../components/CustomHeader";
import { getNavigate, showLog } from "../../helper/utility";
import { ROUTES } from "../../routes/Routes";

const Settings = () => {
    const navigate = getNavigate();
    const [settingList] = useState<string[]>([
        "Offers", "Roles", "Expense\nTypes", "Expense\nCategory", "Marketing\nCategory", "Marketing\nTypes", "Privacy Policy","Tax Charges\n&\nOther Charges"
    ]);

    const handleOnClick = (title: string) => {
        if (title == "Roles") {
            navigate?.(ROUTES.ROLE.path);
        }else if(title == "Tax Charges\n&\nOther Charges"){
            navigate?.(ROUTES.TAX_OTHER_CHARGES.path);
        }
    }

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Settings"
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

export default Settings;