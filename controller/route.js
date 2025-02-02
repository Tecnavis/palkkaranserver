const RouteModel = require("../models/route");

exports. create = async (req, res) => {
    try {
        const route = await RouteModel.create(req.body);
        res.status(201).json(route);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        const routes = await RouteModel.find();
        res.status(200).json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.get = async (req, res) => {
    try {
        const route = await RouteModel.findById(req.params.id);
        res.status(200).json(route);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const route = await RouteModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(route);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const route = await RouteModel.findByIdAndDelete(req.params.id);
        res.status(200).json(route);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteAll = async (req, res) => {
    try {
        const routes = await RouteModel.deleteMany({});
        res.status(200).json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};