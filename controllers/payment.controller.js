import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─────────────────────────────────────────────────
// POST /api/payment/checkout
// Creates a Stripe Checkout Session from the user's cart
// ─────────────────────────────────────────────────
export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user's cart with product details
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (!cartItems.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2. Build Stripe line items
    const lineItems = cartItems.map((item) => {
      const discountedPrice = item.product.discount
        ? item.product.price * (1 - item.product.discount / 100)
        : item.product.price;

      // Filter images: Stripe only accepts public URLs, and they must be <= 2048 chars.
      // We skip data URIs (base64) and very long URLs.
      const validImages = (item.product.imageUrl || [])
        .filter(url => url.startsWith('http') && url.length <= 2000)
        .slice(0, 1);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.product.title,
            description: item.product.description?.slice(0, 200) || "",
            images: validImages,
            metadata: { productId: item.product.id },
          },
          unit_amount: Math.round(discountedPrice * 100), // cents
        },
        quantity: item.quantity,
      };
    });

    // 3. Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      const discountedPrice = item.product.discount
        ? item.product.price * (1 - item.product.discount / 100)
        : item.product.price;
      return sum + discountedPrice * item.quantity;
    }, 0);

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: { userId },
    });

    // 5. Save a PENDING order in the database
    await prisma.order.create({
      data: {
        userId,
        stripeSessionId: session.id,
        status: "PENDING",
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.product.id,
            title: item.product.title,
            imageUrl: item.product.imageUrl?.[0] || "",
            price: item.product.discount
              ? parseFloat(
                  (item.product.price * (1 - item.product.discount / 100)).toFixed(2)
                )
              : item.product.price,
            quantity: item.quantity,
          })),
        },
      },
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ message: "Failed to create checkout session", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// POST /api/payment/webhook
// Stripe sends events here after payment
// ─────────────────────────────────────────────────
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,          // raw Buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle successful payment
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // Update order to PAID and attach paymentIntentId
      const order = await prisma.order.update({
        where: { stripeSessionId: session.id },
        data: {
          status: "PAID",
          paymentIntentId: session.payment_intent,
        },
      });

      // Clear the user's cart after successful payment
      await prisma.cartItem.deleteMany({
        where: { userId: order.userId },
      });

      console.log(`✅ Order ${order.id} marked as PAID`);
    } catch (err) {
      console.error("Failed to update order after payment:", err);
      return res.status(500).json({ message: "DB update failed" });
    }
  }

  // Handle payment failure
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    try {
      await prisma.order.update({
        where: { stripeSessionId: session.id },
        data: { status: "CANCELLED" },
      });
    } catch (err) {
      console.error("Failed to cancel order:", err);
    }
  }

  res.status(200).json({ received: true });
};

// ─────────────────────────────────────────────────
// GET /api/payment/orders
// Returns all orders for the authenticated user
// ─────────────────────────────────────────────────
export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: { product: { select: { id: true, title: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/payment/orders/:orderId
// Returns a single order by ID (owner only)
// ─────────────────────────────────────────────────
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { product: { select: { id: true, title: true, imageUrl: true, category: true } } },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Ensure user can only access their own orders
    if (order.userId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Failed to fetch order", error: error.message });
  }
};

// ─────────────────────────────────────────────────
// GET /api/payment/orders (admin)
// Returns ALL orders (admin only)
// ─────────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};
