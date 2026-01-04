-- Allow all authenticated users to view pending orders in the order book
-- This is essential for a trading platform - order book must be public
CREATE POLICY "Public can view pending orders for order book"
ON public.orders FOR SELECT
TO authenticated
USING (status IN ('pending', 'partially_filled'));