import { useState } from "react";
import CustomHeader from "../../components/CustomHeader";
import { ROUTES } from "../../routes/Routes";

const Settings = () => {
    const [settingList] = useState<string[]>([
        "Offers", "Roles", "Expense\nTypes", "Expense\nCategory", "Marketing\nCategory", "Marketing\nTypes", "Privacy Policy","Tax Charges\n&\nOther Charges","User Home\nCounts"
    ]);

    const handleOnClick = (title: string) => {
        if (title == "Roles") {
            window.open(ROUTES.ROLE.path, "_blank");
        }else if(title == "Tax Charges\n&\nOther Charges"){
            window.open(ROUTES.TAX_OTHER_CHARGES.path, "_blank");
        }else if(title == "User Home\nCounts"){
            window.open(ROUTES.USER_HOME_COUNTS.path, "_blank");
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