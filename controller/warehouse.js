const Warehouse = require('../models/warehouse')
const asyncHandler = require("express-async-handler");


exports.create = asyncHandler(async (req, res) => {
    const warehouse = await Warehouse.create(req.body);
    res.status(200).json(warehouse);
})

exports.getAll = asyncHandler(async (req, res) => {
    const warehouse = await Warehouse.find();
    res.status(200).json(warehouse);
})

exports.get = asyncHandler(async (req, res) => {
    const warehouse = await Warehouse.findById(req.params.id);
    res.status(200).json(warehouse);
})

exports.update = asyncHandler(async (req, res) => {
    const { name, email, phone, address } = req.body;
    const { id } = req.params;
    try {
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            return res.status(400).json({ message: "Warehouse not found to update" });
        }
        warehouse.name = name;
        warehouse.email = email;
        warehouse.phone = phone;
        warehouse.address = address;
        const updatedWarehouse = await warehouse.save();
        return res.json({ updatedWarehouse });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
});

exports.delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const warehouse = await Warehouse.findByIdAndDelete(id);
        if (!warehouse) {
            return res.status(404).json({ message: "Warehouse not found" });
        }
        return res.json({ message: "Warehouse deleted successfully" });
    } catch (error) {   
        return res.status(500).json({ message: "Server error", error: error.message });
    }
});

exports.deleteAll = asyncHandler(async (req, res) => {
    try {
        await Warehouse.deleteMany({});
        return res.json({ message: "All warehouses deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
});