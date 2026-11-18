import { Route, Routes } from "react-router-dom";
import TableMapScreen from "./TableMapScreen";
import NewOrderScreen from "./NewOrderScreen";
import WaiterNotifications from "./WaiterNotifications";
import ServiceDock from "../floor/ServiceDock";

export default function WaiterHome() {
  return (
    <>
      <WaiterNotifications />
      <ServiceDock mode="waiter" />
      <Routes>
        <Route index element={<TableMapScreen />} />
        <Route path="table/:tableId" element={<NewOrderScreen />} />
      </Routes>
    </>
  );
}
