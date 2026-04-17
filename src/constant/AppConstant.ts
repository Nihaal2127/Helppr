export const AppConstant = {
    BASE_URL: "https://csx88sd9ed.execute-api.ap-south-1.amazonaws.com/prod/api",//Help Pr Live
    IMAGE_BASE_URL: "https://d2snwgkdggvp65.cloudfront.net/",//Help Pr Live
    // BASE_URL: "http://localhost:5001/api",
    // BASE_URL: "https://raamisegei.execute-api.us-east-1.amazonaws.com/dev/api",
    // IMAGE_BASE_URL: "https://d2d4noj5f8gqer.cloudfront.net/",
    authToken: "authToken",
    deviceToken: "deviceToken",
    isAdmin: "isAdmin",
    /** "admin" | "franchise_admin" | "employee" — set on login; used for mock logout and future RBAC. */
    userRole: "userRole",
    adminId: "adminId",
    partnerId: "partnerId",
    createdById: "createdById",
    isAuthenticated: "isAuthenticated",
    canAccessExpenseSheet: "canAccessExpenseSheet",
    CART_KEY: "cart",
    currencySymbol: "₹",
    percentageSymbol: "%",
    companyName: "Helper",
    helplineNumber: "+61434380737",
    supportEmail: "info@sostyres.com.au",
    companyLocation: " 8/41 Lensworth St, Coopers plains,4108, Australia",

    /**
     * Verification tab (`/user/getVerificationAll`): when `true`, use the real API.
     * Set to `false` to use in-app mock rows and summary counts for UI design when the endpoint errors.
     */
    USE_REAL_VERIFICATION_API: false,
};

/** Values stored under AppConstant.userRole */
export const UserRole = {
    ADMIN: "admin",
    FRANCHISE_ADMIN: "franchise_admin",
    EMPLOYEE: "employee",
} as const;