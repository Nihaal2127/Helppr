import React, { useEffect, useRef, useState } from "react";
import { Row, Col } from "react-bootstrap";
import CustomFormSelect from "../components/CustomFormSelect";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../routes/Routes";
import {
    fetchRecentNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../services/notificationService";
import { formatDate } from "../helper/utility";

// Previous simple header implementation (kept for reference)
// const CustomHeader = ({ title }: { title: string }) => {
//     return (
//         <Row className="g-0 p-0 mb-4 align-items-center">
//             <Col sm={4} className="p-0 m-0">
//                 <h4 className="m-0 p-0">{title}</h4>
//             </Col>
//             {/* <Col sm={8} className="d-flex justify-content-end p-0 m-0">
//                 <CustomFormSelect
//                     label=""
//                     controlId="location"
//                     options={locationList}
//                     register={register}
//                     fieldName="location_id"
//                     defaultValue={selectedLocation}
//                     setValue={setValue}
//                     onChange={handleChange}
//                 />
//             </Col> */}
//         </Row>
//     );
// };

interface CustomHeaderProps {
    title: string;
    /** Shown to the left of the title (e.g. financial sub-page back arrow). */
    titlePrefix?: React.ReactNode;
    register?: any;
    setValue?: (name: string, value: any, options?: { shouldValidate?: boolean }) => void;
    onLocationChange?: (selectedLocation: string) => void;
    rightActions?: React.ReactNode;
}

const CustomHeader = ({
    title,
    titlePrefix,
    register,
    setValue,
    onLocationChange,
    rightActions,
}: CustomHeaderProps) => {
    const navigate = useNavigate();
    const [selectedFranchise, setSelectedFranchise] = useState<string>("");
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const notificationRef = useRef<HTMLDivElement | null>(null);

    // Dummy franchise list (until API-driven data is wired)
    const franchiseList = [
        { value: "all", label: "All Franchises" },
        { value: "franch-1", label: "Franchise Alpha" },
        { value: "franch-2", label: "Franchise Beta" },
        { value: "franch-3", label: "Franchise Gamma" },
        { value: "franch-4", label: "Franchise Delta" },
        { value: "franch-5", label: "Franchise Epsilon" },
    ];

    const handleChange = (e: any) => {
        const value = e.target.value as string;
        setSelectedFranchise(value);
        if (onLocationChange) {
            // Backward-compatible callback name; current dropdown is for franchises.
            onLocationChange(value);
        }
    };

    const refreshNotifications = () => {
        setUnreadCount(getUnreadNotificationCount());
        setRecentNotifications(fetchRecentNotifications(6));
    };

    useEffect(() => {
        refreshNotifications();
        const onUpdated = () => refreshNotifications();
        const onStorage = () => refreshNotifications();
        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!notificationRef.current?.contains(target)) {
                setIsNotificationOpen(false);
            }
        };

        window.addEventListener("notifications-updated", onUpdated);
        window.addEventListener("storage", onStorage);
        document.addEventListener("mousedown", onClickOutside);

        return () => {
            window.removeEventListener("notifications-updated", onUpdated);
            window.removeEventListener("storage", onStorage);
            document.removeEventListener("mousedown", onClickOutside);
        };
    }, []);

    return (
        <Row className="g-0 p-0 mb-4 align-items-center">
            <Col sm={6} className="p-0 m-0">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {titlePrefix}
                    <h4 className="m-0 p-0">{title}</h4>
                </div>
            </Col>
            <Col sm={6} className="d-flex justify-content-end align-items-center gap-3 p-0 m-0">
                {rightActions}
                {register && setValue && (
                    <div style={{ minWidth: 220, maxWidth: 260, zIndex: 10 }}>
                        <CustomFormSelect
                            label=""
                                controlId="Franchise"
                                options={franchiseList}
                            register={register}
                                fieldName="franchise_id"
                                defaultValue={selectedFranchise}
                            setValue={setValue}
                            onChange={handleChange}
                            asCol={false} 
                            noBottomMargin
                        />
                    </div>
                )}
                <div ref={notificationRef} className="position-relative">
                    <button
                        type="button"
                        className="btn p-0 border-0 bg-transparent position-relative"
                        aria-label="Notifications"
                        onClick={() => setIsNotificationOpen((prev) => !prev)}
                    >
                        <i className="bi bi-bell-fill fs-4" style={{ color: "#dc3545" }} />
                        {unreadCount > 0 && (
                            <span className="custom-notification-badge">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationOpen && (
                        <div className="custom-notification-dropdown">
                            <div className="custom-notification-header">
                                <span>Notifications</span>
                                <button
                                    type="button"
                                    className="btn btn-link p-0"
                                    onClick={() => {
                                        markAllNotificationsAsRead();
                                        refreshNotifications();
                                    }}
                                >
                                    Mark all read
                                </button>
                            </div>

                            <div className="custom-notification-list">
                                {recentNotifications.length === 0 ? (
                                    <div className="custom-notification-empty">No notifications</div>
                                ) : (
                                    recentNotifications.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`custom-notification-item ${item.status === "unread" ? "is-unread" : ""}`}
                                            onClick={() => {
                                                markNotificationAsRead(item.id);
                                                refreshNotifications();
                                                setIsNotificationOpen(false);
                                                navigate(ROUTES.NOTIFICATIONS.path);
                                            }}
                                        >
                                            <div className="custom-notification-item-title-row">
                                                <span className="custom-notification-item-title">{item.title}</span>
                                                {item.status === "unread" && (
                                                    <span className="custom-notification-dot" />
                                                )}
                                            </div>
                                            <div className="custom-notification-item-message">{item.message}</div>
                                            <div className="custom-notification-item-time">{formatDate(item.createdAt)}</div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <button
                                type="button"
                                className="custom-notification-view-all"
                                onClick={() => {
                                    setIsNotificationOpen(false);
                                    navigate(ROUTES.NOTIFICATIONS.path);
                                }}
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>

            </Col>
        </Row>
    );
};

export default CustomHeader;
