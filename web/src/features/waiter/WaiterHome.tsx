import { Route, Routes } from "react-router-dom";
import TableMapScreen from "./TableMapScreen";
import NewOrderScreen from "./NewOrderScreen";
import WaiterNotifications from "./WaiterNotifications";

export default function WaiterHome() {
  return (
    <>
      <WaiterNotifications />
      <Routes>
        <Route index element={<TableMapScreen />} />
        <Route path="table/:tableId" element={<NewOrderScreen />} />
      </Routes>
    </>
  );
}
