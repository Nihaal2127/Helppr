let navigate: (path: string) => void;

export const setNavigate = (nav: (path: string) => void) => {
    navigate = nav;
};

export const getNavigate = () => navigate;

export const capitalizeString = (str: string) => 
    str.replace(/\b\w/g, char => char.toUpperCase());
  