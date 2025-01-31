const Plan = require("../models/plans");
const Customer = require("../models/customer");

// Utility function to calculate 30 days from the current date
const calculateMonthlyDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 30; i++) {
        const newDate = new Date(today);
        newDate.setDate(today.getDate() + i);
        dates.push(newDate);
    }
    return dates;
};

// Create a new plan for a customer
exports.createPlan = async (req, res) => {
    const { customerId, planType, customDates, weeklyDays, alternativeDays } = req.body;

    try {
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        let dates = [];
        switch (planType) {
            case "daily":
                dates.push(new Date()); // Current date for daily plan
                break;

            case "custom":
                if (!customDates || !Array.isArray(customDates)) {
                    return res.status(400).json({ message: "Invalid custom dates" });
                }
                dates = customDates.map(date => new Date(date));
                break;

            case "weekly":
                if (!weeklyDays || !Array.isArray(weeklyDays)) {
                    return res.status(400).json({ message: "Invalid weekly days" });
                }
                const currentDay = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
                weeklyDays.forEach(day => {
                    const offset = (day - currentDay + 7) % 7; // Offset to the next day
                    const nextDay = new Date();
                    nextDay.setDate(new Date().getDate() + offset);
                    dates.push(nextDay);
                });
                break;

                case "alternative":
                    const { startDate, interval } = req.body; // Expect startDate and interval (e.g., every 2 days)
                    if (!startDate || !interval || typeof interval !== "number") {
                        return res.status(400).json({ message: "Invalid alternative plan details" });
                    }
                
                    const altStartDate = new Date(startDate);
                    for (let i = 0; i < 15; i++) { // Generate 15 alternative dates dynamically
                        let nextDate = new Date(altStartDate);
                        nextDate.setDate(altStartDate.getDate() + i * interval);
                        dates.push(nextDate);
                    }
                    break;
                

            case "monthly":
                dates = calculateMonthlyDates();
                break;

            default:
                return res.status(400).json({ message: "Invalid plan type" });
        }

        const newPlan = new Plan({
            customer: customerId,
            planType,
            dates
        });

        await newPlan.save();
        res.status(201).json({ message: "Plan created successfully", plan: newPlan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get plans and customer details
exports.getPlans = async (req, res) => {
    try {
        const plans = await Plan.find().populate("customer");
        res.status(200).json(plans);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};




// Stop a daily plan
exports.stopDailyPlan =async (req, res) => {
    const { planId } = req.params;
    const today = new Date(); // Get the current date

    try {
        const plan = await Plan.findById(planId);

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        // Remove future dates (keep only dates up to today)
        const updatedDates = plan.dates.filter(date => new Date(date) <= today);

        // Update the plan: set inactive and update dates
        plan.isActive = false;
        plan.dates = updatedDates;

        await plan.save();

        res.status(200).json({ message: `${plan.planType} plan stopped successfully`, plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getPlansByCustomerId = async (req, res) => {
    const { customerId } = req.params;

    try {
        const plans = await Plan.find({ customer: customerId }).populate("customer");

        if (plans.length === 0) {
            return res.status(404).json({ message: "No plans found for this customer" });
        }

        const updatedPlans = plans.map((plan) => {
            let dynamicDates = [];

            if (plan.planType === "daily" && plan.isActive) {
                const today = new Date();
                for (let i = 0; i < 30; i++) {
                    const nextDate = new Date(today);
                    nextDate.setDate(today.getDate() + i);
                    dynamicDates.push({
                        date: nextDate,
                        isLeave: plan.leaves.some(
                            (leave) => leave.toISOString() === nextDate.toISOString()
                        ),
                    });
                }
            }

            return {
                ...plan._doc,
                dynamicDates,
            };
        });

        res.status(200).json(updatedPlans);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// Apply leave for a specific plan
exports.applyLeave = async (req, res) => {
    const { customerId, date } = req.body;

    try {
        const plan = await Plan.findOne({ customer: customerId, isActive: true });

        if (!plan) {
            return res.status(404).json({ message: "No active plan found for this customer" });
        }

        const leaveDate = new Date(date);

        // Check if the date is already in the leave array
        if (plan.leaves.some((leave) => leave.toISOString() === leaveDate.toISOString())) {
            return res.status(400).json({ message: "Leave already applied for this date" });
        }

        plan.leaves.push(leaveDate);
        await plan.save();

        res.status(200).json({ message: "Leave applied successfully", plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
