import { useState } from "react";
import { Row, Col } from "react-bootstrap";
import CustomFormSelect from "../components/CustomFormSelect";

interface CustomHeaderProps {
     title: string;
    // register: any;
    // setValue: (name: string, value: any) => void;
    // onLocationChange: (selectedLocation: string) => void;
}

const CustomHeader = ({ 
    title,
    // register,
    // setValue,
    //onLocationChange
}: CustomHeaderProps) => {
    const [selectedLocation, setSelectedLocation] = useState<string>("");

    const locationList = [
        { value: "1", label: "Rajkot" },
        { value: "2", label: "Jamnagar" },
        { value: "3", label: "Surat" },
        { value: "4", label: "Ahmadabad" },
    ];

    // const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    //     const value = e.target.value;
    //     setSelectedLocation(value);
    //     onLocationChange(value);
    // };

    return (
        <Row className="g-0 p-0 mb-4 align-items-center">
            <Col sm={4} className="p-0 m-0">
                <h4 className="m-0 p-0">{title}</h4>
            </Col>
            {/* <Col sm={8} className="d-flex justify-content-end p-0 m-0">
                <CustomFormSelect
                    label=""
                    controlId="location"
                    options={locationList}
                    register={register}
                    fieldName="location_id"
                    defaultValue={selectedLocation}
                    setValue={setValue}
                    onChange={handleChange}
                />
            </Col> */}
        </Row>
    );
};

export default CustomHeader;
