const ReviewModel = require("../models/review");

exports.create = async (req, res) => {
    const { customerId, productId, rating, comment } = req.body;
    const review = new ReviewModel({ customerId, productId, rating, comment });
    const result = await review.save();
    res.send(result);
};

exports.getAll = async (req, res) => {
    try {
        const result = await ReviewModel.find()
            .populate("customerId", "name email") // Fetch specific fields from Customer
            .populate("productId", "name price category productId"); // Fetch specific fields from Product
        
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};


exports.get = async (req, res) => {
    const result = await ReviewModel.findById(req.params.id);
    res.send(result);
};

exports.update = async (req, res) => {
    const { customerId, productId, rating, comment } = req.body;
    const { id } = req.params;
    const result = await ReviewModel.findByIdAndUpdate(id, { customerId, productId, rating, comment });
    res.send(result);
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    const result = await ReviewModel.findByIdAndDelete(id);
    res.send(result);
};

exports.deleteAll = async (req, res) => {
    const result = await ReviewModel.deleteMany();
    res.send(result);
};

