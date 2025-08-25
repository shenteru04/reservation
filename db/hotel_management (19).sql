-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 25, 2025 at 10:16 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hotel_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `advance_payments`
--

CREATE TABLE `advance_payments` (
  `advance_payment_id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method_id` int(11) NOT NULL,
  `payment_status_id` int(11) NOT NULL DEFAULT 3,
  `reference_number` varchar(100) DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `advance_payments`
--

INSERT INTO `advance_payments` (`advance_payment_id`, `reservation_id`, `amount`, `payment_method_id`, `payment_status_id`, `reference_number`, `payment_date`, `notes`, `created_at`, `updated_at`) VALUES
(16, 24, 1650.00, 2, 3, '543463545345345', '2025-08-24 08:07:50', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-24 00:07:50', '2025-08-24 00:07:50'),
(17, 25, 2300.00, 2, 3, '543463545345345', '2025-08-24 09:58:34', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-24 01:58:34', '2025-08-24 01:58:34'),
(18, 27, 2000.00, 1, 3, '', '2025-08-24 11:51:13', 'Advance payment for reservation', '2025-08-24 03:51:13', '2025-08-24 03:51:13'),
(19, 28, 5000.00, 1, 3, '', '2025-08-24 14:06:53', 'Advance payment for reservation', '2025-08-24 06:06:53', '2025-08-24 06:06:53'),
(20, 29, 7040.00, 2, 3, '62964926983628', '2025-08-24 23:04:29', 'Advance payment for reservation - Reference: 62964926983628', '2025-08-24 15:04:29', '2025-08-24 15:04:29'),
(21, 30, 2980.00, 2, 3, '543463545345345', '2025-08-25 04:53:54', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-24 20:53:54', '2025-08-24 20:53:54');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `valid_id` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `advance_payment` decimal(10,2) DEFAULT NULL,
  `payment_proof` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `first_name`, `last_name`, `email`, `valid_id`, `phone_number`, `advance_payment`, `payment_proof`) VALUES
(1, 'yoyo', 'vill', 'yoyo@gmail.com', NULL, '09354623235', 0.00, NULL),
(2, 'Janice', 'Jamito', 'janice@hotel.com', NULL, '09354623235', 0.00, NULL),
(3, 'Clint', 'Plaza', 'bobo@gmail.com', NULL, '657868878', 0.00, NULL),
(6, 'Shankai', 'Bai', 'shangkaibai@hotel.com', NULL, '0966343734643', NULL, NULL),
(7, 'Gregor', 'Mac', 'macgregor@hotel.com', NULL, '09354623235', NULL, NULL),
(8, 'Christian', 'Boncales', 'christianboncales@gmail.com', NULL, '0848395839', NULL, NULL),
(9, 'John Lester', 'Zarsosa', 'john@hotel.com', NULL, '093447257293', NULL, NULL),
(10, 'Gardo', 'vill', 'gardo@hotel.com', NULL, '24625462342642', NULL, NULL),
(11, 'Apple', 'Edrolin', 'apple@gmail.com', NULL, '09112034321342', NULL, NULL),
(12, 'Kenneth', 'Lopez', 'kennethlopez@gmail.com', NULL, '09123456789', NULL, NULL),
(13, 'Clint Denzel', 'Plaza', 'clintdenzelplaza@gmail.com', NULL, '09123456789', NULL, NULL),
(14, 'Arline', 'Boncales', 'arline@gmail.com', NULL, '09678714583', NULL, NULL),
(15, 'Haro', 'Kart', 'haro@gmail.com', NULL, '09678715483', NULL, NULL),
(16, 'Janice', 'Jamito', 'janicejamito@gmail.com', NULL, '097645138545', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `employee_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `phone_num` varchar(20) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`employee_id`, `email`, `first_name`, `last_name`, `phone_num`, `password`, `role_id`, `is_active`, `created_at`, `last_login`) VALUES
(1, 'admin@hotel.com', 'Admin', 'User', '09123456789', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, '2025-08-09 10:21:32', '2025-08-25 01:42:21'),
(2, 'christianboncales@gmail.com', 'Christian', 'Boncales', '23526234', '$2y$10$0DKMurz/LaIsoGOUuxcz.OahbOs20ymE3zoJy1u/TBmAxvXqacnNq', 2, 1, '2025-08-10 12:50:56', '2025-08-25 05:38:41'),
(5, 'clintplaza@gmail.com', 'Clint', 'Plaza', '542423324253', '$2y$10$n3i5bCjmyuyPW6TGWuULsu/qf69sQTzITSTZbXD6PNdi.Egqnjcdm', 3, 1, '2025-08-18 08:24:28', '2025-08-25 05:40:06');

--
-- Triggers `employees`
--
DELIMITER $$
CREATE TRIGGER `after_employee_insert` AFTER INSERT ON `employees` FOR EACH ROW BEGIN
    INSERT INTO users (employee_id) VALUES (NEW.employee_id);
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `extra_charges`
--

CREATE TABLE `extra_charges` (
  `extra_charges_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hotel_services`
--

CREATE TABLE `hotel_services` (
  `service_id` int(11) NOT NULL,
  `service_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_complimentary` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hotel_services`
--

INSERT INTO `hotel_services` (`service_id`, `service_name`, `description`, `price`, `is_complimentary`) VALUES
(1, 'Laundry Service', 'Clothes picked up and returned within 24 hours', 150.00, 0),
(2, 'Wake-Up Call', 'Phone call to wake guest at requested time', 0.00, 1),
(3, 'Extra Pillow', 'Request for additional pillow', 0.00, 1),
(4, 'Extra Blanket', 'Request for extra blanket', 0.00, 1),
(5, 'Room Cleaning', 'Cleaning outside housekeeping schedule', 0.00, 1),
(6, 'Towel Replacement', 'Fresh towel delivered to room', 0.00, 1),
(7, 'Ironing Service', 'Clothes ironed upon request', 100.00, 0),
(8, 'Shoe Cleaning', 'Complimentary shoe shine service', 0.00, 1),
(9, 'Room Upgrade', 'Upgrade to next available room class', 1000.00, 0),
(10, 'Late Checkout', 'Extend checkout by 2 hours', 500.00, 0),
(11, 'Airport Shuttle', 'Ride to/from the airport', 800.00, 0),
(12, 'Extra Service', 'Different services', 100.00, 0),
(13, 'Premium Massage', 'VIP treatment', 500.00, 0),
(14, 'Pet Cleaning', 'We wash and clean you pets', 600.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `invoice_id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('Paid','Unpaid','Partial','Pending') DEFAULT 'Unpaid',
  `due_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `employee_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`invoice_id`, `invoice_number`, `reservation_id`, `total_amount`, `paid_amount`, `payment_status`, `due_date`, `notes`, `created_at`, `updated_at`, `employee_id`) VALUES
(8, 'INV-2025080001', 28, 13220.00, 13220.00, 'Paid', '2025-08-31', 'Advance Payment', '2025-08-24 12:34:51', '2025-08-24 12:47:48', 2),
(9, 'INV-2025080002', 25, 4600.00, 4600.00, 'Paid', '2025-08-31', '', '2025-08-24 12:50:09', '2025-08-24 12:51:07', 2),
(10, 'INV-2025080003', 24, 4100.00, 4100.00, 'Paid', '2025-08-31', 'Advance Payment', '2025-08-24 13:59:24', '2025-08-24 14:56:40', NULL),
(11, 'INV-2025080004', 30, 6060.00, 3030.00, 'Partial', '2025-08-31', '', '2025-08-24 21:27:34', '2025-08-24 21:28:12', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `invoice_item_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `item_type` enum('room','service','food','other') DEFAULT 'other',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoice_items`
--

INSERT INTO `invoice_items` (`invoice_item_id`, `invoice_id`, `description`, `quantity`, `unit_price`, `total_price`, `item_type`, `created_at`) VALUES
(6, 8, 'Room charges and services', 1, 13220.00, 13220.00, 'room', '2025-08-24 12:34:51'),
(7, 9, 'Room charges and services', 1, 4600.00, 4600.00, 'room', '2025-08-24 12:50:09'),
(8, 10, 'Room charges and services', 1, 4100.00, 4100.00, 'room', '2025-08-24 13:59:24'),
(9, 11, 'Room charges and services', 1, 6060.00, 6060.00, 'room', '2025-08-24 21:27:34');

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_status`
--

CREATE TABLE `maintenance_status` (
  `maintenance_status_id` int(11) NOT NULL,
  `status_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `maintenance_status`
--

INSERT INTO `maintenance_status` (`maintenance_status_id`, `status_name`) VALUES
(1, 'Scheduled'),
(2, 'In Progress'),
(3, 'Completed'),
(4, 'Delayed'),
(5, 'Cancelled');

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `menu_id` int(11) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`menu_id`, `item_name`, `description`, `price`, `category`, `is_available`, `created_at`, `updated_at`) VALUES
(1, 'American Breakfast', 'Includes eggs, bacon, toast, and coffee', 320.00, 'Breakfast', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(2, 'Continental Breakfast', 'Bread, butter, jam, juice, and tea', 280.00, 'Breakfast', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(3, 'Pancakes with Syrup', 'Fluffy pancakes with maple syrup', 250.00, 'Breakfast', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(4, 'Omelette Special', 'Cheese and ham omelette with toast', 270.00, 'Breakfast', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(5, 'Grilled Chicken', 'Served with mashed potatoes and veggies', 450.00, 'Main Course', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(6, 'Beef Steak', 'Tenderloin steak with gravy and fries', 690.00, 'Main Course', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(7, 'Seafood Platter', 'Assorted grilled seafood with lemon butter', 780.00, 'Main Course', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(8, 'Spaghetti Bolognese', 'Pasta with ground beef tomato sauce', 320.00, 'Main Course', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(9, 'Vegetarian Stir Fry', 'Assorted veggies stir-fried in soy-garlic sauce', 300.00, 'Main Course', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(10, 'Bottled Water', '500ml purified bottled water', 30.00, 'Drinks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(11, 'Coca-Cola', 'Chilled soft drink (can)', 60.00, 'Drinks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(12, 'Fresh Mango Juice', 'Freshly blended mangoes with ice', 120.00, 'Drinks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(13, 'Hot Coffee', 'Fresh brewed hotel blend coffee', 90.00, 'Drinks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(14, 'Iced Tea', 'Sweet lemon iced tea', 80.00, 'Drinks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(15, 'Chocolate Cake Slice', 'Moist chocolate cake with ganache', 160.00, 'Desserts', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(16, 'Leche Flan', 'Creamy caramel custard dessert', 120.00, 'Desserts', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(17, 'Fruit Salad', 'Chilled mix of tropical fruits and cream', 130.00, 'Desserts', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(18, 'Ice Cream Sundae', 'Vanilla ice cream with chocolate syrup', 150.00, 'Desserts', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(19, 'Club Sandwich', 'Triple-decker sandwich with chips', 220.00, 'Snacks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(20, 'French Fries', 'Crispy golden fries with ketchup', 90.00, 'Snacks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(21, 'Nachos', 'Cheesy nachos with salsa dip', 180.00, 'Snacks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(22, 'Chicken Wings', '6-piece spicy buffalo wings', 260.00, 'Snacks', 1, '2025-08-03 11:45:30', '2025-08-03 11:45:30'),
(23, 'American Cream', 'Include cream pies', 100.00, 'Desserts', 1, '2025-08-16 08:21:53', '2025-08-16 08:21:53'),
(24, 'Wagyu Beef Steak', 'Best Beef Quality', 1000.00, 'Main Course', 1, '2025-08-23 00:32:43', '2025-08-23 00:32:43');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `invoice_id`, `amount`, `payment_method`, `payment_date`, `reference_number`, `notes`, `created_at`) VALUES
(9, 8, 5000.00, 'cash', '2025-08-24 06:34:51', 'INV-INV-2025080001', 'Initial payment recorded with invoice', '2025-08-24 12:34:51'),
(10, 8, 8220.00, '1', '2025-08-24 06:42:20', 'PAY-1756039340024', 'Payment recorded via front desk', '2025-08-24 12:42:20'),
(11, 9, 2300.00, '1', '2025-08-24 06:50:26', 'PAY-1756039826199', 'Payment recorded via front desk', '2025-08-24 12:50:26'),
(12, 10, 1650.00, 'cash', '2025-08-24 07:59:24', 'INV-INV-2025080003', 'Initial payment recorded with invoice', '2025-08-24 13:59:24'),
(13, 10, 1200.00, '1', '2025-08-24 08:00:17', 'PAY-1756044017117', 'Payment recorded via front desk', '2025-08-24 14:00:17'),
(14, 10, 625.00, '1', '2025-08-24 08:34:02', 'PAY-1756046042880', 'Payment recorded via front desk', '2025-08-24 14:34:02'),
(15, 10, 625.00, '1', '2025-08-24 08:56:40', 'PAY-1756047400122', 'Payment recorded via front desk', '2025-08-24 14:56:40'),
(16, 11, 3030.00, '1', '2025-08-24 15:28:12', 'PAY-1756070892127', 'Payment recorded via front desk', '2025-08-24 21:28:12');

-- --------------------------------------------------------

--
-- Table structure for table `payment_logs`
--

CREATE TABLE `payment_logs` (
  `log_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `reservation_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recorded_by` varchar(100) NOT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `action_type` enum('create_invoice','record_payment','update_invoice','delete_invoice') NOT NULL,
  `previous_status` varchar(20) DEFAULT NULL,
  `new_status` varchar(20) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_logs`
--

INSERT INTO `payment_logs` (`log_id`, `invoice_id`, `reservation_id`, `amount`, `payment_method`, `reference_number`, `notes`, `recorded_by`, `recorded_at`, `action_type`, `previous_status`, `new_status`, `ip_address`, `user_agent`) VALUES
(1, 10, 24, 625.00, '1', 'PAY-1756046042880', 'Payment recorded via front desk', 'Unknown User', '2025-08-24 14:34:02', 'record_payment', 'Partial', 'Partial', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'),
(2, 10, 24, 625.00, '1', 'PAY-1756047400122', 'Payment recorded via front desk', 'Unknown User', '2025-08-24 14:56:40', 'record_payment', 'Partial', 'Paid', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'),
(3, 11, 30, 6060.00, 'cash', 'INV-INV-2025080004', '', 'Unknown User', '2025-08-24 21:27:34', 'create_invoice', NULL, 'Unpaid', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'),
(4, 11, 30, 3030.00, '1', 'PAY-1756070892127', 'Payment recorded via front desk', 'Unknown User', '2025-08-24 21:28:12', 'record_payment', 'Unpaid', 'Partial', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36');

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `payment_method_id` int(11) NOT NULL,
  `method_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_methods`
--

INSERT INTO `payment_methods` (`payment_method_id`, `method_name`) VALUES
(1, 'Cash'),
(2, 'GCash'),
(3, 'Bank Transfer'),
(4, 'Credit Card'),
(5, 'Debit Card');

-- --------------------------------------------------------

--
-- Table structure for table `payment_status`
--

CREATE TABLE `payment_status` (
  `payment_status_id` int(11) NOT NULL,
  `status_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_status`
--

INSERT INTO `payment_status` (`payment_status_id`, `status_name`) VALUES
(1, 'Paid'),
(2, 'Unpaid'),
(3, 'Pending'),
(4, 'Partial');

-- --------------------------------------------------------

--
-- Table structure for table `request_items`
--

CREATE TABLE `request_items` (
  `request_items_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `menu_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_items`
--

INSERT INTO `request_items` (`request_items_id`, `request_id`, `menu_id`, `service_id`, `quantity`) VALUES
(23, 23, NULL, 11, 1),
(24, 24, NULL, 4, 1),
(25, 25, NULL, 3, 1),
(26, 26, NULL, 5, 1),
(27, 27, 1, NULL, 1),
(28, 28, 1, NULL, 1),
(29, 29, 4, NULL, 1),
(30, 30, 23, NULL, 1),
(31, 31, 10, NULL, 1),
(32, 32, 6, NULL, 1),
(33, 33, NULL, 3, 1),
(34, 34, NULL, 8, 1),
(35, 35, NULL, 4, 1),
(36, 36, NULL, 3, 1),
(37, 37, NULL, 5, 1),
(38, 38, NULL, 6, 1),
(39, 39, NULL, 7, 1);

-- --------------------------------------------------------

--
-- Table structure for table `request_status`
--

CREATE TABLE `request_status` (
  `request_status_id` int(11) NOT NULL,
  `status_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_status`
--

INSERT INTO `request_status` (`request_status_id`, `status_name`) VALUES
(1, 'Pending'),
(2, 'Approved'),
(3, 'In Progress'),
(4, 'Completed'),
(5, 'Cancelled');

-- --------------------------------------------------------

--
-- Table structure for table `request_types`
--

CREATE TABLE `request_types` (
  `request_type_id` int(11) NOT NULL,
  `type_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_types`
--

INSERT INTO `request_types` (`request_type_id`, `type_name`) VALUES
(1, 'Room Service'),
(2, 'Food Delivery');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `reservation_id` int(11) NOT NULL,
  `reservation_type_id` int(11) DEFAULT NULL,
  `room_id` int(11) DEFAULT NULL,
  `room_type_id` int(11) DEFAULT NULL,
  `booking_type` enum('specific_room','room_type') DEFAULT 'specific_room',
  `room_assignment_pending` tinyint(1) DEFAULT 0,
  `customer_id` int(11) DEFAULT NULL,
  `check_in_date` date NOT NULL,
  `checkin_datetime` datetime DEFAULT NULL,
  `check_out_date` date NOT NULL,
  `checkout_datetime` datetime DEFAULT NULL,
  `reservation_status_id` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `advance_payment` decimal(10,2) DEFAULT 0.00,
  `guest_count` int(11) DEFAULT 1,
  `special_requests` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`reservation_id`, `reservation_type_id`, `room_id`, `room_type_id`, `booking_type`, `room_assignment_pending`, `customer_id`, `check_in_date`, `checkin_datetime`, `check_out_date`, `checkout_datetime`, `reservation_status_id`, `total_amount`, `created_at`, `updated_at`, `advance_payment`, `guest_count`, `special_requests`) VALUES
(24, 2, 24, 2, 'room_type', 0, 8, '2025-08-24', '2025-08-24 15:00:00', '2025-08-25', '2025-08-25 12:00:00', 2, 4100.00, '2025-08-24 08:07:50', '2025-08-24 09:21:24', 1650.00, 1, ''),
(25, 2, 7, 7, 'room_type', 0, 2, '2025-08-24', '2025-08-24 15:00:00', '2025-08-25', '2025-08-25 12:00:00', 2, 4600.00, '2025-08-24 09:58:34', '2025-08-24 10:36:53', 2300.00, 1, ''),
(27, 1, 35, NULL, 'specific_room', 0, 6, '2025-08-27', NULL, '2025-08-30', NULL, 5, 4470.00, '2025-08-24 11:51:13', '2025-08-24 14:07:02', 2000.00, 2, NULL),
(28, 1, 14, NULL, 'specific_room', 0, 6, '2025-08-27', '2025-08-27 16:00:00', '2025-08-31', '2025-08-31 13:00:00', 3, 13220.00, '2025-08-24 14:06:53', '2025-08-24 19:08:55', 5000.00, 3, NULL),
(29, 2, 32, 7, 'room_type', 0, 16, '2025-08-25', '2025-08-25 14:00:00', '2025-08-28', '2025-08-28 08:00:00', 2, 14380.00, '2025-08-24 23:04:29', '2025-08-25 04:50:21', 7040.00, 2, 'Kiss tas hug lang'),
(30, 2, 19, 8, 'room_type', 0, 9, '2025-08-24', '2025-08-24 15:00:00', '2025-08-25', '2025-08-25 12:00:00', 2, 6060.00, '2025-08-25 04:53:54', '2025-08-25 05:27:27', 2980.00, 1, '');

-- --------------------------------------------------------

--
-- Table structure for table `reservation_logs`
--

CREATE TABLE `reservation_logs` (
  `log_id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL,
  `user_type` enum('customer','front_desk') DEFAULT 'customer',
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `notes` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservation_logs`
--

INSERT INTO `reservation_logs` (`log_id`, `reservation_id`, `action_type`, `timestamp`, `user_id`, `user_type`, `old_values`, `new_values`, `notes`, `ip_address`) VALUES
(27, 24, 'reservation_created', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'New reservation created for customer', '127.0.0.1'),
(28, 24, 'payment_received', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'Advance payment received', '127.0.0.1'),
(29, 24, 'room_assigned', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'Room assigned to reservation', '127.0.0.1'),
(30, 24, 'status_changed', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'Reservation status changed from Pending to Confirmed', '127.0.0.1'),
(31, 25, 'reservation_created', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'New reservation created for customer', '127.0.0.1'),
(32, 25, 'room_assigned', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'Room assigned to reservation', '127.0.0.1'),
(33, 25, 'status_changed', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'Reservation status changed from Pending to Confirmed', '127.0.0.1'),
(34, 25, 'check_in', '2025-08-24 02:44:00', 1, 'front_desk', NULL, NULL, 'Guest checked in', '127.0.0.1'),
(35, 27, 'status_changed', '2025-08-24 03:52:02', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":33,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-26\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-29\",\"checkout_datetime\":null,\"reservation_status_id\":1,\"total_amount\":\"4240.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 11:51:13\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":1}', '{\"reservation_id\":27,\"reservation_status_id\":2}', 'Reservation updated by front desk staff', '::1'),
(37, 27, 'amount_updated', '2025-08-24 04:39:38', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":33,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-26\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-29\",\"checkout_datetime\":null,\"reservation_status_id\":2,\"total_amount\":\"4240.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 11:52:02\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":3}', '{\"first_name\":\"Shankai\",\"last_name\":\"Bai\",\"email\":\"shangkaibai@hotel.com\",\"phone_number\":\"09354623235\",\"room_id\":3,\"room_type_id\":3,\"check_in_date\":\"2025-08-26\",\"check_out_date\":\"2025-08-29\",\"checkin_datetime\":\"2025-08-26 15:00:00\",\"checkout_datetime\":\"2025-08-29 12:00:00\",\"guest_count\":2,\"special_requests\":null,\"reservation_type_id\":1,\"booking_type\":\"room\",\"room_assignment_pending\":0,\"reservation_status_id\":1,\"total_amount\":8670,\"advance_payment\":2000,\"payment_method_id\":1,\"reference_number\":null,\"services\":[4,5],\"menu_items\":[{\"id\":1,\"quantity\":1},{\"id\":2,\"quantity\":1},{\"id\":4,\"quantity\":1}],\"reservation_id\":27}', 'Reservation updated by front desk staff', '::1'),
(38, 27, 'status_changed', '2025-08-24 04:39:51', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":3,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-26\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-29\",\"checkout_datetime\":null,\"reservation_status_id\":1,\"total_amount\":\"8670.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 12:39:38\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":1}', '{\"reservation_id\":27,\"reservation_status_id\":2}', 'Reservation updated by front desk staff', '::1'),
(39, 27, 'amount_updated', '2025-08-24 04:43:58', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":3,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-26\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-29\",\"checkout_datetime\":null,\"reservation_status_id\":2,\"total_amount\":\"8670.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 12:39:51\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":3}', '{\"first_name\":\"Shankai\",\"last_name\":\"Bai\",\"email\":\"shangkaibai@hotel.com\",\"phone_number\":\"09354623235\",\"room_id\":35,\"room_type_id\":12,\"check_in_date\":\"2025-08-27\",\"check_out_date\":\"2025-08-30\",\"checkin_datetime\":\"2025-08-27 15:00:00\",\"checkout_datetime\":\"2025-08-30 12:00:00\",\"guest_count\":2,\"special_requests\":null,\"reservation_type_id\":1,\"booking_type\":\"room\",\"room_assignment_pending\":0,\"reservation_status_id\":1,\"total_amount\":4190,\"advance_payment\":2000,\"payment_method_id\":1,\"reference_number\":null,\"services\":[],\"menu_items\":[{\"id\":1,\"quantity\":1},{\"id\":4,\"quantity\":1}],\"reservation_id\":27}', 'Reservation updated by front desk staff', '::1'),
(40, 27, 'status_changed', '2025-08-24 04:52:28', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":35,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-27\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-30\",\"checkout_datetime\":null,\"reservation_status_id\":1,\"total_amount\":\"4190.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 12:43:58\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":1}', '{\"reservation_id\":27,\"reservation_status_id\":5}', 'Reservation updated by front desk staff', '::1'),
(41, 27, 'amount_updated', '2025-08-24 04:53:11', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":35,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-27\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-30\",\"checkout_datetime\":null,\"reservation_status_id\":5,\"total_amount\":\"4190.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 12:52:28\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":1}', '{\"first_name\":\"Shankai\",\"last_name\":\"Bai\",\"email\":\"shangkaibai@hotel.com\",\"phone_number\":\"09354623235\",\"room_id\":35,\"room_type_id\":12,\"check_in_date\":\"2025-08-27\",\"check_out_date\":\"2025-08-30\",\"checkin_datetime\":\"2025-08-27 14:00:00\",\"checkout_datetime\":\"2025-08-30 08:00:00\",\"guest_count\":2,\"special_requests\":null,\"reservation_type_id\":1,\"booking_type\":\"room\",\"room_assignment_pending\":0,\"reservation_status_id\":1,\"total_amount\":4150,\"advance_payment\":2000,\"payment_method_id\":1,\"reference_number\":null,\"services\":[4,5],\"menu_items\":[{\"id\":2,\"quantity\":1},{\"id\":4,\"quantity\":1}],\"reservation_id\":27}', 'Reservation updated by front desk staff', '::1'),
(42, 27, 'amount_updated', '2025-08-24 05:59:12', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":35,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-27\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-30\",\"checkout_datetime\":null,\"reservation_status_id\":1,\"total_amount\":\"4150.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 12:53:11\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":1}', '{\"first_name\":\"Shankai\",\"last_name\":\"Bai\",\"email\":\"shangkaibai@hotel.com\",\"phone_number\":\"09354623235\",\"room_id\":35,\"room_type_id\":12,\"check_in_date\":\"2025-08-27\",\"check_out_date\":\"2025-08-30\",\"checkin_datetime\":\"2025-08-27 14:00:00\",\"checkout_datetime\":\"2025-08-30 08:00:00\",\"guest_count\":2,\"special_requests\":null,\"reservation_type_id\":1,\"booking_type\":\"room\",\"room_assignment_pending\":0,\"reservation_status_id\":1,\"total_amount\":5000,\"advance_payment\":2000,\"payment_method_id\":1,\"reference_number\":null,\"services\":[2,11],\"menu_items\":[{\"id\":1,\"quantity\":1},{\"id\":2,\"quantity\":1}],\"reservation_id\":27}', 'Reservation updated by front desk staff', '::1'),
(43, 27, 'amount_updated', '2025-08-24 06:05:51', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":35,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-27\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-30\",\"checkout_datetime\":null,\"reservation_status_id\":1,\"total_amount\":\"5000.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 13:59:11\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":1}', '{\"first_name\":\"Shankai\",\"last_name\":\"Bai\",\"email\":\"shangkaibai@hotel.com\",\"phone_number\":\"09354623235\",\"room_id\":35,\"room_type_id\":12,\"check_in_date\":\"2025-08-27\",\"check_out_date\":\"2025-08-30\",\"checkin_datetime\":\"2025-08-27 14:00:00\",\"checkout_datetime\":\"2025-08-30 08:00:00\",\"guest_count\":2,\"special_requests\":null,\"reservation_type_id\":1,\"booking_type\":\"room\",\"room_assignment_pending\":0,\"reservation_status_id\":1,\"total_amount\":4470,\"advance_payment\":2000,\"payment_method_id\":1,\"reference_number\":null,\"services\":[3,8],\"menu_items\":[{\"id\":1,\"quantity\":1},{\"id\":2,\"quantity\":1},{\"id\":4,\"quantity\":1}],\"reservation_id\":27}', 'Reservation updated by front desk staff', '::1'),
(44, 27, 'status_changed', '2025-08-24 06:07:02', 2, 'front_desk', '{\"reservation_id\":27,\"reservation_type_id\":1,\"room_id\":35,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-27\",\"checkin_datetime\":null,\"check_out_date\":\"2025-08-30\",\"checkout_datetime\":null,\"reservation_status_id\":1,\"total_amount\":\"4470.00\",\"created_at\":\"2025-08-24 11:51:13\",\"updated_at\":\"2025-08-24 14:05:51\",\"advance_payment\":\"2000.00\",\"guest_count\":2,\"special_requests\":null,\"current_room_status\":1}', '{\"reservation_id\":27,\"reservation_status_id\":5}', 'Reservation updated by front desk staff', '::1'),
(45, 28, 'status_changed', '2025-08-24 06:07:19', 2, 'front_desk', '{\"reservation_id\":28,\"reservation_type_id\":1,\"room_id\":14,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-27\",\"checkin_datetime\":\"2025-08-27 16:00:00\",\"check_out_date\":\"2025-08-31\",\"checkout_datetime\":\"2025-08-31 13:00:00\",\"reservation_status_id\":1,\"total_amount\":\"13220.00\",\"created_at\":\"2025-08-24 14:06:53\",\"updated_at\":\"2025-08-24 14:06:53\",\"advance_payment\":\"5000.00\",\"guest_count\":3,\"special_requests\":null,\"current_room_status\":1}', '{\"reservation_id\":28,\"reservation_status_id\":2}', 'Reservation updated by front desk staff', '::1'),
(46, 28, 'status_changed', '2025-08-24 11:08:55', 2, 'front_desk', '{\"reservation_id\":28,\"reservation_type_id\":1,\"room_id\":14,\"room_type_id\":null,\"booking_type\":\"specific_room\",\"room_assignment_pending\":0,\"customer_id\":6,\"check_in_date\":\"2025-08-27\",\"checkin_datetime\":\"2025-08-27 16:00:00\",\"check_out_date\":\"2025-08-31\",\"checkout_datetime\":\"2025-08-31 13:00:00\",\"reservation_status_id\":2,\"total_amount\":\"13220.00\",\"created_at\":\"2025-08-24 14:06:53\",\"updated_at\":\"2025-08-24 14:07:19\",\"advance_payment\":\"5000.00\",\"guest_count\":3,\"special_requests\":null,\"current_room_status\":3}', '{\"reservation_id\":28,\"reservation_status_id\":3}', 'Reservation updated by front desk staff', '::1'),
(47, 29, 'created', '2025-08-24 15:04:29', 16, 'customer', NULL, '{\"room_type_id\":7,\"checkin_datetime\":\"2025-08-25 14:00:00\",\"checkout_datetime\":\"2025-08-28 08:00:00\",\"total_amount\":14380,\"guest_count\":2,\"pricing_adjustments\":{\"checkin_adjustment\":500,\"checkout_adjustment\":-200,\"total_adjustment\":300,\"details\":[\"Early check-in fee: \\u20b1500\",\"Early check-out discount: -\\u20b1200\"]},\"booking_type\":\"room_type\"}', 'Online room type reservation with datetime selection', NULL),
(48, 29, 'payment_received', '2025-08-24 15:04:29', 16, 'customer', NULL, '{\"advance_payment_id\":\"20\",\"amount\":7040,\"payment_method_id\":2,\"reference_number\":\"62964926983628\"}', 'Advance payment processed for room type booking', NULL),
(49, 29, 'status_changed', '2025-08-24 20:40:33', 2, 'front_desk', '{\"reservation_id\":29,\"reservation_type_id\":2,\"room_id\":null,\"room_type_id\":7,\"booking_type\":\"room_type\",\"room_assignment_pending\":1,\"customer_id\":16,\"check_in_date\":\"2025-08-25\",\"checkin_datetime\":\"2025-08-25 14:00:00\",\"check_out_date\":\"2025-08-28\",\"checkout_datetime\":\"2025-08-28 08:00:00\",\"reservation_status_id\":1,\"total_amount\":\"14380.00\",\"created_at\":\"2025-08-24 23:04:29\",\"updated_at\":\"2025-08-24 23:04:29\",\"advance_payment\":\"7040.00\",\"guest_count\":2,\"special_requests\":\"Kiss tas hug lang\",\"current_room_status\":null}', '{\"reservation_id\":29,\"reservation_status_id\":2}', 'Reservation updated by front desk staff', '::1'),
(50, 29, 'room_assigned', '2025-08-24 20:50:21', 2, 'front_desk', '{\"room_id\":null}', '{\"room_id\":32}', 'Room 32 assigned to reservation by front desk staff', '::1'),
(51, 30, 'created', '2025-08-24 20:53:54', 9, 'customer', NULL, '{\"room_type_id\":8,\"checkin_datetime\":\"2025-08-24 15:00:00\",\"checkout_datetime\":\"2025-08-25 12:00:00\",\"total_amount\":5960,\"guest_count\":1,\"pricing_adjustments\":{\"checkin_adjustment\":0,\"checkout_adjustment\":0,\"total_adjustment\":0,\"details\":[]},\"booking_type\":\"room_type\"}', 'Online room type reservation with datetime selection', NULL),
(52, 30, 'modified', '2025-08-24 20:53:54', 9, 'customer', NULL, '{\"old_total\":5960,\"new_total\":6060,\"additional_charges\":100}', 'Added services and menu items to room type booking', NULL),
(53, 30, 'payment_received', '2025-08-24 20:53:54', 9, 'customer', NULL, '{\"advance_payment_id\":\"21\",\"amount\":2980,\"payment_method_id\":2,\"reference_number\":\"543463545345345\"}', 'Advance payment processed for room type booking', NULL),
(54, 30, 'room_assigned', '2025-08-24 21:26:16', 2, 'front_desk', '{\"room_id\":null}', '{\"room_id\":19}', 'Room 19 assigned to reservation by front desk staff', '::1'),
(55, 30, 'status_changed', '2025-08-24 21:27:27', 2, 'front_desk', '{\"reservation_id\":30,\"reservation_type_id\":2,\"room_id\":19,\"room_type_id\":8,\"booking_type\":\"room_type\",\"room_assignment_pending\":0,\"customer_id\":9,\"check_in_date\":\"2025-08-24\",\"checkin_datetime\":\"2025-08-24 15:00:00\",\"check_out_date\":\"2025-08-25\",\"checkout_datetime\":\"2025-08-25 12:00:00\",\"reservation_status_id\":1,\"total_amount\":\"6060.00\",\"created_at\":\"2025-08-25 04:53:54\",\"updated_at\":\"2025-08-25 05:26:16\",\"advance_payment\":\"2980.00\",\"guest_count\":1,\"special_requests\":\"\",\"current_room_status\":3}', '{\"reservation_id\":30,\"reservation_status_id\":2}', 'Reservation updated by front desk staff', '::1');

-- --------------------------------------------------------

--
-- Table structure for table `reservation_status`
--

CREATE TABLE `reservation_status` (
  `reservation_status_id` int(11) NOT NULL,
  `status_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservation_status`
--

INSERT INTO `reservation_status` (`reservation_status_id`, `status_name`) VALUES
(1, 'Pending'),
(2, 'Confirmed'),
(3, 'Checked-in'),
(4, 'Checked-out'),
(5, 'Cancelled');

-- --------------------------------------------------------

--
-- Table structure for table `reservation_type`
--

CREATE TABLE `reservation_type` (
  `reservation_type_id` int(11) NOT NULL,
  `type_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservation_type`
--

INSERT INTO `reservation_type` (`reservation_type_id`, `type_name`) VALUES
(1, 'Walk-in'),
(2, 'Online');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `room_id` int(11) NOT NULL,
  `room_number` varchar(10) NOT NULL,
  `room_type_id` int(11) NOT NULL,
  `room_status_id` int(11) NOT NULL,
  `floor_number` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`room_id`, `room_number`, `room_type_id`, `room_status_id`, `floor_number`) VALUES
(1, '101', 2, 5, 1),
(2, '102', 2, 1, 1),
(3, '103', 3, 3, 1),
(4, '104', 4, 1, 1),
(5, '105', 5, 1, 1),
(6, '201', 6, 1, 2),
(7, '202', 7, 3, 2),
(8, '203', 8, 1, 2),
(9, '204', 9, 1, 2),
(10, '205', 10, 1, 2),
(11, '301', 11, 5, 3),
(12, '302', 1, 1, 3),
(13, '303', 2, 1, 3),
(14, '304', 3, 2, 3),
(15, '305', 4, 1, 3),
(16, '401', 5, 1, 4),
(17, '402', 6, 1, 4),
(18, '403', 7, 1, 4),
(19, '404', 8, 3, 4),
(20, '405', 9, 1, 4),
(21, '501', 10, 5, 5),
(22, '502', 11, 1, 5),
(23, '503', 1, 1, 5),
(24, '504', 2, 3, 5),
(25, '505', 3, 1, 5),
(27, '206', 11, 1, 2),
(28, '601', 7, 1, 6),
(29, '602', 7, 1, 6),
(30, '603', 7, 1, 6),
(31, '604', 7, 1, 6),
(32, '605', 7, 3, 6),
(33, '1001', 12, 3, 10),
(34, '210', 7, 1, 2),
(35, '1002', 12, 5, 10);

-- --------------------------------------------------------

--
-- Table structure for table `room_amenities`
--

CREATE TABLE `room_amenities` (
  `amenity_id` int(11) NOT NULL,
  `amenity_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_amenities`
--

INSERT INTO `room_amenities` (`amenity_id`, `amenity_name`, `description`, `icon`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Wi-Fi', 'Free high-speed wireless internet', 'fas fa-wifi', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(2, 'Air Conditioning', 'Climate controlled room temperature', 'fas fa-snowflake', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(3, 'Television', 'Flat screen TV with cable channels', 'fas fa-tv', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(4, 'Mini Bar', 'In-room refrigerated mini bar', 'fas fa-glass-martini', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(5, 'Safe', 'Electronic in-room safe', 'fas fa-lock', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(6, 'Balcony', 'Private balcony with view', 'fas fa-door-open', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(7, 'Bathtub', 'Private bathroom with bathtub', 'fas fa-bath', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(8, 'Shower', 'Private bathroom with shower', 'fas fa-shower', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(9, 'Hair Dryer', 'Complimentary hair dryer', 'fas fa-wind', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(10, 'Iron & Ironing Board', 'In-room ironing facilities', 'fas fa-tshirt', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(11, 'Coffee Maker', 'In-room coffee and tea making facilities', 'fas fa-coffee', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(12, 'Room Service', '24-hour room service available', 'fas fa-concierge-bell', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(13, 'Desk & Chair', 'Work desk with ergonomic chair', 'fas fa-chair', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(14, 'Wardrobe', 'Built-in wardrobe with hangers', 'fas fa-tshirt', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(15, 'Telephone', 'Direct dial telephone', 'fas fa-phone', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(16, 'Blackout Curtains', 'Light blocking window treatments', 'fas fa-moon', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(17, 'Wake-up Service', 'Complimentary wake-up call service', 'fas fa-alarm-clock', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(18, 'Daily Housekeeping', 'Daily room cleaning service', 'fas fa-broom', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(19, 'Towels & Linens', 'Fresh towels and bed linens', 'fas fa-bed', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58'),
(20, 'Complimentary Toiletries', 'Basic bathroom amenities provided', 'fas fa-soap', 1, '2025-08-15 23:53:58', '2025-08-15 23:53:58');

-- --------------------------------------------------------

--
-- Table structure for table `room_amenities_mapping`
--

CREATE TABLE `room_amenities_mapping` (
  `mapping_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `amenity_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_amenities_mapping`
--

INSERT INTO `room_amenities_mapping` (`mapping_id`, `room_id`, `amenity_id`, `created_at`) VALUES
(2, 18, 2, '2025-08-15 23:53:58'),
(7, 32, 2, '2025-08-15 23:53:58'),
(8, 8, 2, '2025-08-15 23:53:58'),
(9, 19, 2, '2025-08-15 23:53:58'),
(11, 20, 2, '2025-08-15 23:53:58'),
(13, 22, 2, '2025-08-15 23:53:58'),
(14, 27, 2, '2025-08-15 23:53:58'),
(16, 18, 6, '2025-08-15 23:53:58'),
(21, 32, 6, '2025-08-15 23:53:58'),
(22, 8, 6, '2025-08-15 23:53:58'),
(23, 19, 6, '2025-08-15 23:53:58'),
(25, 20, 6, '2025-08-15 23:53:58'),
(27, 22, 6, '2025-08-15 23:53:58'),
(28, 27, 6, '2025-08-15 23:53:58'),
(30, 18, 7, '2025-08-15 23:53:58'),
(35, 32, 7, '2025-08-15 23:53:58'),
(36, 8, 7, '2025-08-15 23:53:58'),
(37, 19, 7, '2025-08-15 23:53:58'),
(39, 20, 7, '2025-08-15 23:53:58'),
(41, 22, 7, '2025-08-15 23:53:58'),
(42, 27, 7, '2025-08-15 23:53:58'),
(44, 18, 16, '2025-08-15 23:53:58'),
(49, 32, 16, '2025-08-15 23:53:58'),
(50, 8, 16, '2025-08-15 23:53:58'),
(51, 19, 16, '2025-08-15 23:53:58'),
(53, 20, 16, '2025-08-15 23:53:58'),
(55, 22, 16, '2025-08-15 23:53:58'),
(56, 27, 16, '2025-08-15 23:53:58'),
(58, 18, 11, '2025-08-15 23:53:58'),
(63, 32, 11, '2025-08-15 23:53:58'),
(64, 8, 11, '2025-08-15 23:53:58'),
(65, 19, 11, '2025-08-15 23:53:58'),
(67, 20, 11, '2025-08-15 23:53:58'),
(69, 22, 11, '2025-08-15 23:53:58'),
(70, 27, 11, '2025-08-15 23:53:58'),
(72, 18, 20, '2025-08-15 23:53:58'),
(77, 32, 20, '2025-08-15 23:53:58'),
(78, 8, 20, '2025-08-15 23:53:58'),
(79, 19, 20, '2025-08-15 23:53:58'),
(81, 20, 20, '2025-08-15 23:53:58'),
(83, 22, 20, '2025-08-15 23:53:58'),
(84, 27, 20, '2025-08-15 23:53:58'),
(86, 18, 18, '2025-08-15 23:53:58'),
(91, 32, 18, '2025-08-15 23:53:58'),
(92, 8, 18, '2025-08-15 23:53:58'),
(93, 19, 18, '2025-08-15 23:53:58'),
(95, 20, 18, '2025-08-15 23:53:58'),
(97, 22, 18, '2025-08-15 23:53:58'),
(98, 27, 18, '2025-08-15 23:53:58'),
(100, 18, 13, '2025-08-15 23:53:58'),
(105, 32, 13, '2025-08-15 23:53:58'),
(106, 8, 13, '2025-08-15 23:53:58'),
(107, 19, 13, '2025-08-15 23:53:58'),
(109, 20, 13, '2025-08-15 23:53:58'),
(111, 22, 13, '2025-08-15 23:53:58'),
(112, 27, 13, '2025-08-15 23:53:58'),
(114, 18, 9, '2025-08-15 23:53:58'),
(119, 32, 9, '2025-08-15 23:53:58'),
(120, 8, 9, '2025-08-15 23:53:58'),
(121, 19, 9, '2025-08-15 23:53:58'),
(123, 20, 9, '2025-08-15 23:53:58'),
(125, 22, 9, '2025-08-15 23:53:58'),
(126, 27, 9, '2025-08-15 23:53:58'),
(128, 18, 10, '2025-08-15 23:53:58'),
(133, 32, 10, '2025-08-15 23:53:58'),
(134, 8, 10, '2025-08-15 23:53:58'),
(135, 19, 10, '2025-08-15 23:53:58'),
(137, 20, 10, '2025-08-15 23:53:58'),
(139, 22, 10, '2025-08-15 23:53:58'),
(140, 27, 10, '2025-08-15 23:53:58'),
(142, 18, 4, '2025-08-15 23:53:58'),
(147, 32, 4, '2025-08-15 23:53:58'),
(148, 8, 4, '2025-08-15 23:53:58'),
(149, 19, 4, '2025-08-15 23:53:58'),
(151, 20, 4, '2025-08-15 23:53:58'),
(153, 22, 4, '2025-08-15 23:53:58'),
(154, 27, 4, '2025-08-15 23:53:58'),
(156, 18, 12, '2025-08-15 23:53:58'),
(161, 32, 12, '2025-08-15 23:53:58'),
(162, 8, 12, '2025-08-15 23:53:58'),
(163, 19, 12, '2025-08-15 23:53:58'),
(165, 20, 12, '2025-08-15 23:53:58'),
(167, 22, 12, '2025-08-15 23:53:58'),
(168, 27, 12, '2025-08-15 23:53:58'),
(170, 18, 5, '2025-08-15 23:53:58'),
(175, 32, 5, '2025-08-15 23:53:58'),
(176, 8, 5, '2025-08-15 23:53:58'),
(177, 19, 5, '2025-08-15 23:53:58'),
(179, 20, 5, '2025-08-15 23:53:58'),
(181, 22, 5, '2025-08-15 23:53:58'),
(182, 27, 5, '2025-08-15 23:53:58'),
(184, 18, 8, '2025-08-15 23:53:58'),
(189, 32, 8, '2025-08-15 23:53:58'),
(190, 8, 8, '2025-08-15 23:53:58'),
(191, 19, 8, '2025-08-15 23:53:58'),
(193, 20, 8, '2025-08-15 23:53:58'),
(195, 22, 8, '2025-08-15 23:53:58'),
(196, 27, 8, '2025-08-15 23:53:58'),
(198, 18, 15, '2025-08-15 23:53:58'),
(203, 32, 15, '2025-08-15 23:53:58'),
(204, 8, 15, '2025-08-15 23:53:58'),
(205, 19, 15, '2025-08-15 23:53:58'),
(207, 20, 15, '2025-08-15 23:53:58'),
(209, 22, 15, '2025-08-15 23:53:58'),
(210, 27, 15, '2025-08-15 23:53:58'),
(212, 18, 3, '2025-08-15 23:53:58'),
(217, 32, 3, '2025-08-15 23:53:58'),
(218, 8, 3, '2025-08-15 23:53:58'),
(219, 19, 3, '2025-08-15 23:53:58'),
(221, 20, 3, '2025-08-15 23:53:58'),
(223, 22, 3, '2025-08-15 23:53:58'),
(224, 27, 3, '2025-08-15 23:53:58'),
(226, 18, 19, '2025-08-15 23:53:58'),
(231, 32, 19, '2025-08-15 23:53:58'),
(232, 8, 19, '2025-08-15 23:53:58'),
(233, 19, 19, '2025-08-15 23:53:58'),
(235, 20, 19, '2025-08-15 23:53:58'),
(237, 22, 19, '2025-08-15 23:53:58'),
(238, 27, 19, '2025-08-15 23:53:58'),
(240, 18, 17, '2025-08-15 23:53:58'),
(245, 32, 17, '2025-08-15 23:53:58'),
(246, 8, 17, '2025-08-15 23:53:58'),
(247, 19, 17, '2025-08-15 23:53:58'),
(249, 20, 17, '2025-08-15 23:53:58'),
(251, 22, 17, '2025-08-15 23:53:58'),
(252, 27, 17, '2025-08-15 23:53:58'),
(254, 18, 14, '2025-08-15 23:53:58'),
(259, 32, 14, '2025-08-15 23:53:58'),
(260, 8, 14, '2025-08-15 23:53:58'),
(261, 19, 14, '2025-08-15 23:53:58'),
(263, 20, 14, '2025-08-15 23:53:58'),
(265, 22, 14, '2025-08-15 23:53:58'),
(266, 27, 14, '2025-08-15 23:53:58'),
(268, 18, 1, '2025-08-15 23:53:58'),
(273, 32, 1, '2025-08-15 23:53:58'),
(274, 8, 1, '2025-08-15 23:53:58'),
(275, 19, 1, '2025-08-15 23:53:58'),
(277, 20, 1, '2025-08-15 23:53:58'),
(279, 22, 1, '2025-08-15 23:53:58'),
(280, 27, 1, '2025-08-15 23:53:58'),
(512, 5, 2, '2025-08-15 23:53:58'),
(513, 16, 2, '2025-08-15 23:53:58'),
(514, 6, 2, '2025-08-15 23:53:58'),
(515, 17, 2, '2025-08-15 23:53:58'),
(518, 5, 7, '2025-08-15 23:53:58'),
(519, 16, 7, '2025-08-15 23:53:58'),
(520, 6, 7, '2025-08-15 23:53:58'),
(521, 17, 7, '2025-08-15 23:53:58'),
(524, 5, 16, '2025-08-15 23:53:58'),
(525, 16, 16, '2025-08-15 23:53:58'),
(526, 6, 16, '2025-08-15 23:53:58'),
(527, 17, 16, '2025-08-15 23:53:58'),
(530, 5, 11, '2025-08-15 23:53:58'),
(531, 16, 11, '2025-08-15 23:53:58'),
(532, 6, 11, '2025-08-15 23:53:58'),
(533, 17, 11, '2025-08-15 23:53:58'),
(536, 5, 20, '2025-08-15 23:53:58'),
(537, 16, 20, '2025-08-15 23:53:58'),
(538, 6, 20, '2025-08-15 23:53:58'),
(539, 17, 20, '2025-08-15 23:53:58'),
(542, 5, 18, '2025-08-15 23:53:58'),
(543, 16, 18, '2025-08-15 23:53:58'),
(544, 6, 18, '2025-08-15 23:53:58'),
(545, 17, 18, '2025-08-15 23:53:58'),
(548, 5, 13, '2025-08-15 23:53:58'),
(549, 16, 13, '2025-08-15 23:53:58'),
(550, 6, 13, '2025-08-15 23:53:58'),
(551, 17, 13, '2025-08-15 23:53:58'),
(554, 5, 9, '2025-08-15 23:53:58'),
(555, 16, 9, '2025-08-15 23:53:58'),
(556, 6, 9, '2025-08-15 23:53:58'),
(557, 17, 9, '2025-08-15 23:53:58'),
(560, 5, 10, '2025-08-15 23:53:58'),
(561, 16, 10, '2025-08-15 23:53:58'),
(562, 6, 10, '2025-08-15 23:53:58'),
(563, 17, 10, '2025-08-15 23:53:58'),
(566, 5, 12, '2025-08-15 23:53:58'),
(567, 16, 12, '2025-08-15 23:53:58'),
(568, 6, 12, '2025-08-15 23:53:58'),
(569, 17, 12, '2025-08-15 23:53:58'),
(572, 5, 5, '2025-08-15 23:53:58'),
(573, 16, 5, '2025-08-15 23:53:58'),
(574, 6, 5, '2025-08-15 23:53:58'),
(575, 17, 5, '2025-08-15 23:53:58'),
(578, 5, 8, '2025-08-15 23:53:58'),
(579, 16, 8, '2025-08-15 23:53:58'),
(580, 6, 8, '2025-08-15 23:53:58'),
(581, 17, 8, '2025-08-15 23:53:58'),
(584, 5, 15, '2025-08-15 23:53:58'),
(585, 16, 15, '2025-08-15 23:53:58'),
(586, 6, 15, '2025-08-15 23:53:58'),
(587, 17, 15, '2025-08-15 23:53:58'),
(590, 5, 3, '2025-08-15 23:53:58'),
(591, 16, 3, '2025-08-15 23:53:58'),
(592, 6, 3, '2025-08-15 23:53:58'),
(593, 17, 3, '2025-08-15 23:53:58'),
(596, 5, 19, '2025-08-15 23:53:58'),
(597, 16, 19, '2025-08-15 23:53:58'),
(598, 6, 19, '2025-08-15 23:53:58'),
(599, 17, 19, '2025-08-15 23:53:58'),
(602, 5, 17, '2025-08-15 23:53:58'),
(603, 16, 17, '2025-08-15 23:53:58'),
(604, 6, 17, '2025-08-15 23:53:58'),
(605, 17, 17, '2025-08-15 23:53:58'),
(608, 5, 14, '2025-08-15 23:53:58'),
(609, 16, 14, '2025-08-15 23:53:58'),
(610, 6, 14, '2025-08-15 23:53:58'),
(611, 17, 14, '2025-08-15 23:53:58'),
(614, 5, 1, '2025-08-15 23:53:58'),
(615, 16, 1, '2025-08-15 23:53:58'),
(616, 6, 1, '2025-08-15 23:53:58'),
(617, 17, 1, '2025-08-15 23:53:58'),
(640, 13, 2, '2025-08-15 23:53:58'),
(641, 24, 2, '2025-08-15 23:53:58'),
(643, 3, 2, '2025-08-15 23:53:58'),
(644, 14, 2, '2025-08-15 23:53:58'),
(646, 4, 2, '2025-08-15 23:53:58'),
(647, 15, 2, '2025-08-15 23:53:58'),
(649, 13, 20, '2025-08-15 23:53:58'),
(650, 24, 20, '2025-08-15 23:53:58'),
(652, 3, 20, '2025-08-15 23:53:58'),
(653, 14, 20, '2025-08-15 23:53:58'),
(655, 4, 20, '2025-08-15 23:53:58'),
(656, 15, 20, '2025-08-15 23:53:58'),
(658, 13, 18, '2025-08-15 23:53:58'),
(659, 24, 18, '2025-08-15 23:53:58'),
(661, 3, 18, '2025-08-15 23:53:58'),
(662, 14, 18, '2025-08-15 23:53:58'),
(664, 4, 18, '2025-08-15 23:53:58'),
(665, 15, 18, '2025-08-15 23:53:58'),
(667, 13, 13, '2025-08-15 23:53:58'),
(668, 24, 13, '2025-08-15 23:53:58'),
(670, 3, 13, '2025-08-15 23:53:58'),
(671, 14, 13, '2025-08-15 23:53:58'),
(673, 4, 13, '2025-08-15 23:53:58'),
(674, 15, 13, '2025-08-15 23:53:58'),
(676, 13, 9, '2025-08-15 23:53:58'),
(677, 24, 9, '2025-08-15 23:53:58'),
(679, 3, 9, '2025-08-15 23:53:58'),
(680, 14, 9, '2025-08-15 23:53:58'),
(682, 4, 9, '2025-08-15 23:53:58'),
(683, 15, 9, '2025-08-15 23:53:58'),
(685, 13, 5, '2025-08-15 23:53:58'),
(686, 24, 5, '2025-08-15 23:53:58'),
(688, 3, 5, '2025-08-15 23:53:58'),
(689, 14, 5, '2025-08-15 23:53:58'),
(691, 4, 5, '2025-08-15 23:53:58'),
(692, 15, 5, '2025-08-15 23:53:58'),
(694, 13, 8, '2025-08-15 23:53:58'),
(695, 24, 8, '2025-08-15 23:53:58'),
(697, 3, 8, '2025-08-15 23:53:58'),
(698, 14, 8, '2025-08-15 23:53:58'),
(700, 4, 8, '2025-08-15 23:53:58'),
(701, 15, 8, '2025-08-15 23:53:58'),
(703, 13, 15, '2025-08-15 23:53:58'),
(704, 24, 15, '2025-08-15 23:53:58'),
(706, 3, 15, '2025-08-15 23:53:58'),
(707, 14, 15, '2025-08-15 23:53:58'),
(709, 4, 15, '2025-08-15 23:53:58'),
(710, 15, 15, '2025-08-15 23:53:58'),
(712, 13, 3, '2025-08-15 23:53:58'),
(713, 24, 3, '2025-08-15 23:53:58'),
(715, 3, 3, '2025-08-15 23:53:58'),
(716, 14, 3, '2025-08-15 23:53:58'),
(718, 4, 3, '2025-08-15 23:53:58'),
(719, 15, 3, '2025-08-15 23:53:58'),
(721, 13, 19, '2025-08-15 23:53:58'),
(722, 24, 19, '2025-08-15 23:53:58'),
(724, 3, 19, '2025-08-15 23:53:58'),
(725, 14, 19, '2025-08-15 23:53:58'),
(727, 4, 19, '2025-08-15 23:53:58'),
(728, 15, 19, '2025-08-15 23:53:58'),
(730, 13, 14, '2025-08-15 23:53:58'),
(731, 24, 14, '2025-08-15 23:53:58'),
(733, 3, 14, '2025-08-15 23:53:58'),
(734, 14, 14, '2025-08-15 23:53:58'),
(736, 4, 14, '2025-08-15 23:53:58'),
(737, 15, 14, '2025-08-15 23:53:58'),
(739, 13, 1, '2025-08-15 23:53:58'),
(740, 24, 1, '2025-08-15 23:53:58'),
(742, 3, 1, '2025-08-15 23:53:58'),
(743, 14, 1, '2025-08-15 23:53:58'),
(745, 4, 1, '2025-08-15 23:53:58'),
(746, 15, 1, '2025-08-15 23:53:58'),
(767, 12, 2, '2025-08-15 23:53:58'),
(768, 23, 2, '2025-08-15 23:53:58'),
(770, 12, 20, '2025-08-15 23:53:58'),
(771, 23, 20, '2025-08-15 23:53:58'),
(773, 12, 18, '2025-08-15 23:53:58'),
(774, 23, 18, '2025-08-15 23:53:58'),
(776, 12, 13, '2025-08-15 23:53:58'),
(777, 23, 13, '2025-08-15 23:53:58'),
(779, 12, 8, '2025-08-15 23:53:58'),
(780, 23, 8, '2025-08-15 23:53:58'),
(782, 12, 15, '2025-08-15 23:53:58'),
(783, 23, 15, '2025-08-15 23:53:58'),
(785, 12, 3, '2025-08-15 23:53:58'),
(786, 23, 3, '2025-08-15 23:53:58'),
(788, 12, 19, '2025-08-15 23:53:58'),
(789, 23, 19, '2025-08-15 23:53:58'),
(791, 12, 14, '2025-08-15 23:53:58'),
(792, 23, 14, '2025-08-15 23:53:58'),
(794, 12, 1, '2025-08-15 23:53:58'),
(795, 23, 1, '2025-08-15 23:53:58'),
(966, 7, 2, '2025-08-24 02:00:26'),
(967, 7, 6, '2025-08-24 02:00:26'),
(968, 7, 7, '2025-08-24 02:00:26'),
(969, 7, 16, '2025-08-24 02:00:26'),
(970, 7, 11, '2025-08-24 02:00:26'),
(971, 7, 20, '2025-08-24 02:00:26'),
(972, 7, 18, '2025-08-24 02:00:26'),
(973, 7, 13, '2025-08-24 02:00:26'),
(974, 7, 9, '2025-08-24 02:00:26'),
(975, 7, 10, '2025-08-24 02:00:26'),
(976, 7, 4, '2025-08-24 02:00:26'),
(977, 7, 12, '2025-08-24 02:00:26'),
(978, 7, 5, '2025-08-24 02:00:26'),
(979, 7, 8, '2025-08-24 02:00:26'),
(980, 7, 15, '2025-08-24 02:00:26'),
(981, 7, 3, '2025-08-24 02:00:26'),
(982, 7, 19, '2025-08-24 02:00:26'),
(983, 7, 17, '2025-08-24 02:00:26'),
(984, 7, 14, '2025-08-24 02:00:26'),
(985, 7, 1, '2025-08-24 02:00:26'),
(986, 9, 2, '2025-08-24 02:00:30'),
(987, 9, 6, '2025-08-24 02:00:30'),
(988, 9, 7, '2025-08-24 02:00:30'),
(989, 9, 16, '2025-08-24 02:00:30'),
(990, 9, 11, '2025-08-24 02:00:30'),
(991, 9, 20, '2025-08-24 02:00:30'),
(992, 9, 18, '2025-08-24 02:00:30'),
(993, 9, 13, '2025-08-24 02:00:30'),
(994, 9, 9, '2025-08-24 02:00:30'),
(995, 9, 10, '2025-08-24 02:00:30'),
(996, 9, 4, '2025-08-24 02:00:30'),
(997, 9, 12, '2025-08-24 02:00:30'),
(998, 9, 5, '2025-08-24 02:00:30'),
(999, 9, 8, '2025-08-24 02:00:30'),
(1000, 9, 15, '2025-08-24 02:00:30'),
(1001, 9, 3, '2025-08-24 02:00:30'),
(1002, 9, 19, '2025-08-24 02:00:30'),
(1003, 9, 17, '2025-08-24 02:00:30'),
(1004, 9, 14, '2025-08-24 02:00:30'),
(1005, 9, 1, '2025-08-24 02:00:30'),
(1006, 10, 2, '2025-08-24 02:00:35'),
(1007, 10, 7, '2025-08-24 02:00:35'),
(1008, 10, 16, '2025-08-24 02:00:35'),
(1009, 10, 11, '2025-08-24 02:00:35'),
(1010, 10, 20, '2025-08-24 02:00:35'),
(1011, 10, 18, '2025-08-24 02:00:35'),
(1012, 10, 13, '2025-08-24 02:00:35'),
(1013, 10, 9, '2025-08-24 02:00:35'),
(1014, 10, 10, '2025-08-24 02:00:35'),
(1015, 10, 12, '2025-08-24 02:00:35'),
(1016, 10, 5, '2025-08-24 02:00:35'),
(1017, 10, 8, '2025-08-24 02:00:35'),
(1018, 10, 15, '2025-08-24 02:00:35'),
(1019, 10, 3, '2025-08-24 02:00:35'),
(1020, 10, 19, '2025-08-24 02:00:35'),
(1021, 10, 17, '2025-08-24 02:00:35'),
(1022, 10, 14, '2025-08-24 02:00:35'),
(1023, 10, 1, '2025-08-24 02:00:35'),
(1024, 34, 2, '2025-08-24 02:00:41'),
(1025, 34, 20, '2025-08-24 02:00:41'),
(1026, 25, 2, '2025-08-24 02:01:08'),
(1027, 25, 20, '2025-08-24 02:01:08'),
(1028, 25, 18, '2025-08-24 02:01:08'),
(1029, 25, 13, '2025-08-24 02:01:08'),
(1030, 25, 9, '2025-08-24 02:01:08'),
(1031, 25, 5, '2025-08-24 02:01:08'),
(1032, 25, 8, '2025-08-24 02:01:08'),
(1033, 25, 15, '2025-08-24 02:01:08'),
(1034, 25, 3, '2025-08-24 02:01:08'),
(1035, 25, 19, '2025-08-24 02:01:08'),
(1036, 25, 14, '2025-08-24 02:01:08'),
(1037, 25, 1, '2025-08-24 02:01:08'),
(1038, 28, 2, '2025-08-24 02:02:44'),
(1039, 28, 6, '2025-08-24 02:02:44'),
(1040, 28, 7, '2025-08-24 02:02:44'),
(1041, 28, 16, '2025-08-24 02:02:44'),
(1042, 28, 11, '2025-08-24 02:02:44'),
(1043, 28, 20, '2025-08-24 02:02:44'),
(1044, 28, 18, '2025-08-24 02:02:44'),
(1045, 28, 13, '2025-08-24 02:02:44'),
(1046, 28, 9, '2025-08-24 02:02:44'),
(1047, 28, 10, '2025-08-24 02:02:44'),
(1048, 28, 4, '2025-08-24 02:02:44'),
(1049, 28, 12, '2025-08-24 02:02:44'),
(1050, 28, 5, '2025-08-24 02:02:44'),
(1051, 28, 8, '2025-08-24 02:02:44'),
(1052, 28, 15, '2025-08-24 02:02:44'),
(1053, 28, 3, '2025-08-24 02:02:44'),
(1054, 28, 19, '2025-08-24 02:02:44'),
(1055, 28, 17, '2025-08-24 02:02:44'),
(1056, 28, 14, '2025-08-24 02:02:44'),
(1057, 28, 1, '2025-08-24 02:02:44'),
(1058, 29, 2, '2025-08-24 02:02:50'),
(1059, 29, 6, '2025-08-24 02:02:50'),
(1060, 29, 7, '2025-08-24 02:02:50'),
(1061, 29, 16, '2025-08-24 02:02:50'),
(1062, 29, 11, '2025-08-24 02:02:50'),
(1063, 29, 20, '2025-08-24 02:02:50'),
(1064, 29, 18, '2025-08-24 02:02:50'),
(1065, 29, 13, '2025-08-24 02:02:50'),
(1066, 29, 9, '2025-08-24 02:02:50'),
(1067, 29, 10, '2025-08-24 02:02:50'),
(1068, 29, 4, '2025-08-24 02:02:50'),
(1069, 29, 12, '2025-08-24 02:02:50'),
(1070, 29, 5, '2025-08-24 02:02:50'),
(1071, 29, 8, '2025-08-24 02:02:50'),
(1072, 29, 15, '2025-08-24 02:02:50'),
(1073, 29, 3, '2025-08-24 02:02:50'),
(1074, 29, 19, '2025-08-24 02:02:50'),
(1075, 29, 17, '2025-08-24 02:02:50'),
(1076, 29, 14, '2025-08-24 02:02:50'),
(1077, 29, 1, '2025-08-24 02:02:50'),
(1078, 30, 2, '2025-08-24 02:02:53'),
(1079, 30, 6, '2025-08-24 02:02:53'),
(1080, 30, 7, '2025-08-24 02:02:53'),
(1081, 30, 16, '2025-08-24 02:02:53'),
(1082, 30, 11, '2025-08-24 02:02:53'),
(1083, 30, 20, '2025-08-24 02:02:53'),
(1084, 30, 18, '2025-08-24 02:02:53'),
(1085, 30, 13, '2025-08-24 02:02:53'),
(1086, 30, 9, '2025-08-24 02:02:53'),
(1087, 30, 10, '2025-08-24 02:02:53'),
(1088, 30, 4, '2025-08-24 02:02:53'),
(1089, 30, 12, '2025-08-24 02:02:53'),
(1090, 30, 5, '2025-08-24 02:02:53'),
(1091, 30, 8, '2025-08-24 02:02:53'),
(1092, 30, 15, '2025-08-24 02:02:53'),
(1093, 30, 3, '2025-08-24 02:02:53'),
(1094, 30, 19, '2025-08-24 02:02:53'),
(1095, 30, 17, '2025-08-24 02:02:53'),
(1096, 30, 14, '2025-08-24 02:02:53'),
(1097, 30, 1, '2025-08-24 02:02:53'),
(1098, 31, 2, '2025-08-24 02:02:56'),
(1099, 31, 6, '2025-08-24 02:02:56'),
(1100, 31, 7, '2025-08-24 02:02:56'),
(1101, 31, 16, '2025-08-24 02:02:56'),
(1102, 31, 11, '2025-08-24 02:02:56'),
(1103, 31, 20, '2025-08-24 02:02:56'),
(1104, 31, 18, '2025-08-24 02:02:56'),
(1105, 31, 13, '2025-08-24 02:02:56'),
(1106, 31, 9, '2025-08-24 02:02:56'),
(1107, 31, 10, '2025-08-24 02:02:56'),
(1108, 31, 4, '2025-08-24 02:02:56'),
(1109, 31, 12, '2025-08-24 02:02:56'),
(1110, 31, 5, '2025-08-24 02:02:56'),
(1111, 31, 8, '2025-08-24 02:02:56'),
(1112, 31, 15, '2025-08-24 02:02:56'),
(1113, 31, 3, '2025-08-24 02:02:56'),
(1114, 31, 19, '2025-08-24 02:02:56'),
(1115, 31, 17, '2025-08-24 02:02:56'),
(1116, 31, 14, '2025-08-24 02:02:56'),
(1117, 31, 1, '2025-08-24 02:02:56'),
(1118, 33, 2, '2025-08-24 02:03:00'),
(1119, 33, 6, '2025-08-24 02:03:00'),
(1120, 33, 7, '2025-08-24 02:03:00'),
(1121, 33, 16, '2025-08-24 02:03:00'),
(1122, 33, 11, '2025-08-24 02:03:00'),
(1123, 33, 20, '2025-08-24 02:03:00'),
(1124, 33, 18, '2025-08-24 02:03:00'),
(1125, 33, 13, '2025-08-24 02:03:00'),
(1126, 33, 9, '2025-08-24 02:03:00'),
(1127, 33, 10, '2025-08-24 02:03:00'),
(1128, 33, 4, '2025-08-24 02:03:00'),
(1129, 33, 12, '2025-08-24 02:03:00'),
(1130, 33, 5, '2025-08-24 02:03:00'),
(1131, 33, 8, '2025-08-24 02:03:00'),
(1132, 33, 15, '2025-08-24 02:03:00'),
(1133, 33, 3, '2025-08-24 02:03:00'),
(1134, 33, 19, '2025-08-24 02:03:00'),
(1135, 33, 17, '2025-08-24 02:03:00'),
(1136, 33, 14, '2025-08-24 02:03:00'),
(1137, 33, 1, '2025-08-24 02:03:00'),
(1152, 2, 2, '2025-08-25 01:43:42'),
(1153, 2, 20, '2025-08-25 01:43:42'),
(1154, 2, 18, '2025-08-25 01:43:42'),
(1155, 2, 13, '2025-08-25 01:43:42'),
(1156, 2, 9, '2025-08-25 01:43:42'),
(1157, 2, 5, '2025-08-25 01:43:42'),
(1158, 2, 8, '2025-08-25 01:43:42'),
(1159, 2, 15, '2025-08-25 01:43:42'),
(1160, 2, 3, '2025-08-25 01:43:42'),
(1161, 2, 19, '2025-08-25 01:43:42'),
(1162, 2, 14, '2025-08-25 01:43:42'),
(1163, 2, 1, '2025-08-25 01:43:42'),
(1164, 11, 2, '2025-08-25 01:43:52'),
(1165, 11, 6, '2025-08-25 01:43:52'),
(1166, 11, 7, '2025-08-25 01:43:52'),
(1167, 11, 16, '2025-08-25 01:43:52'),
(1168, 11, 11, '2025-08-25 01:43:52'),
(1169, 11, 20, '2025-08-25 01:43:52'),
(1170, 11, 18, '2025-08-25 01:43:52'),
(1171, 11, 13, '2025-08-25 01:43:52'),
(1172, 11, 9, '2025-08-25 01:43:52'),
(1173, 11, 10, '2025-08-25 01:43:52'),
(1174, 11, 4, '2025-08-25 01:43:52'),
(1175, 11, 12, '2025-08-25 01:43:52'),
(1176, 11, 5, '2025-08-25 01:43:52'),
(1177, 11, 8, '2025-08-25 01:43:52'),
(1178, 11, 15, '2025-08-25 01:43:52'),
(1179, 11, 3, '2025-08-25 01:43:52'),
(1180, 11, 19, '2025-08-25 01:43:52'),
(1181, 11, 17, '2025-08-25 01:43:52'),
(1182, 11, 14, '2025-08-25 01:43:52'),
(1183, 11, 1, '2025-08-25 01:43:52'),
(1184, 21, 2, '2025-08-25 01:43:58'),
(1185, 21, 7, '2025-08-25 01:43:58'),
(1186, 21, 16, '2025-08-25 01:43:58'),
(1187, 21, 11, '2025-08-25 01:43:58'),
(1188, 21, 20, '2025-08-25 01:43:58'),
(1189, 21, 18, '2025-08-25 01:43:58'),
(1190, 21, 13, '2025-08-25 01:43:58'),
(1191, 21, 9, '2025-08-25 01:43:58'),
(1192, 21, 10, '2025-08-25 01:43:58'),
(1193, 21, 12, '2025-08-25 01:43:58'),
(1194, 21, 5, '2025-08-25 01:43:58'),
(1195, 21, 8, '2025-08-25 01:43:58'),
(1196, 21, 15, '2025-08-25 01:43:58'),
(1197, 21, 3, '2025-08-25 01:43:58'),
(1198, 21, 19, '2025-08-25 01:43:58'),
(1199, 21, 17, '2025-08-25 01:43:58'),
(1200, 21, 14, '2025-08-25 01:43:58'),
(1201, 21, 1, '2025-08-25 01:43:58'),
(1202, 1, 2, '2025-08-25 06:22:17'),
(1203, 1, 6, '2025-08-25 06:22:17'),
(1204, 1, 7, '2025-08-25 06:22:17'),
(1205, 1, 16, '2025-08-25 06:22:17'),
(1206, 1, 11, '2025-08-25 06:22:17'),
(1207, 1, 20, '2025-08-25 06:22:17'),
(1208, 1, 18, '2025-08-25 06:22:17'),
(1209, 1, 13, '2025-08-25 06:22:17'),
(1210, 1, 8, '2025-08-25 06:22:17'),
(1211, 1, 15, '2025-08-25 06:22:17'),
(1212, 1, 3, '2025-08-25 06:22:17'),
(1213, 1, 19, '2025-08-25 06:22:17'),
(1214, 1, 14, '2025-08-25 06:22:17'),
(1215, 1, 1, '2025-08-25 06:22:17'),
(1216, 35, 2, '2025-08-25 06:22:28'),
(1217, 35, 6, '2025-08-25 06:22:28'),
(1218, 35, 7, '2025-08-25 06:22:28'),
(1219, 35, 16, '2025-08-25 06:22:28'),
(1220, 35, 11, '2025-08-25 06:22:28'),
(1221, 35, 20, '2025-08-25 06:22:28'),
(1222, 35, 18, '2025-08-25 06:22:28'),
(1223, 35, 13, '2025-08-25 06:22:28'),
(1224, 35, 9, '2025-08-25 06:22:28'),
(1225, 35, 10, '2025-08-25 06:22:28'),
(1226, 35, 4, '2025-08-25 06:22:28'),
(1227, 35, 12, '2025-08-25 06:22:28'),
(1228, 35, 5, '2025-08-25 06:22:28'),
(1229, 35, 8, '2025-08-25 06:22:28'),
(1230, 35, 3, '2025-08-25 06:22:28'),
(1231, 35, 19, '2025-08-25 06:22:28'),
(1232, 35, 17, '2025-08-25 06:22:28'),
(1233, 35, 14, '2025-08-25 06:22:28'),
(1234, 35, 1, '2025-08-25 06:22:28');

-- --------------------------------------------------------

--
-- Table structure for table `room_assignments`
--

CREATE TABLE `room_assignments` (
  `assignment_id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `assigned_by` int(11) DEFAULT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `room_maintenance_log`
--

CREATE TABLE `room_maintenance_log` (
  `maintenance_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `maintenance_status_id` int(11) DEFAULT NULL,
  `maintenance_type_id` int(11) DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `employee_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_maintenance_log`
--

INSERT INTO `room_maintenance_log` (`maintenance_id`, `room_id`, `maintenance_status_id`, `maintenance_type_id`, `scheduled_date`, `started_at`, `completed_at`, `cost`, `notes`, `employee_id`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 4, '2025-08-25', NULL, '2025-08-25 10:09:57', 100.00, 'Needed more time to clean and dry the Air conditioner', 5, '2025-08-25 10:09:28', '2025-08-25 10:09:57'),
(2, 2, 3, 8, '2025-08-25', '2025-08-25 10:11:42', '2025-08-25 10:12:10', 100.00, 'This will be fast', 5, '2025-08-25 10:11:38', '2025-08-25 10:12:10'),
(3, 11, 1, 7, '2025-08-25', NULL, NULL, NULL, 'It would be delayed due to hectic schedule', 5, '2025-08-25 13:58:42', '2025-08-25 13:58:42'),
(4, 21, 1, 8, '2025-08-25', NULL, NULL, NULL, 'This will be done by tomorrow', 5, '2025-08-25 13:59:20', '2025-08-25 13:59:20'),
(5, 21, 1, 4, '2025-08-25', NULL, NULL, NULL, 'Due to pest the air conditioner\'s filter become clog', 5, '2025-08-25 14:24:48', '2025-08-25 14:24:48'),
(6, 11, 1, 2, '2025-08-25', NULL, NULL, NULL, 'We notice some clogging in the water filter and need to do some plumbing', 5, '2025-08-25 14:26:10', '2025-08-25 14:26:10');

-- --------------------------------------------------------

--
-- Table structure for table `room_maintenance_type`
--

CREATE TABLE `room_maintenance_type` (
  `maintenance_type_id` int(11) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_maintenance_type`
--

INSERT INTO `room_maintenance_type` (`maintenance_type_id`, `type_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Cleaning', 'Routine or deep cleaning of the room', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(2, 'Plumbing Repair', 'Fixing leaks, faucets, showers, or toilets', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(3, 'Electrical', 'Issues with lights, sockets, switches, or wiring', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(4, 'Air Conditioning', 'AC servicing, repair, or refrigerant refill', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(5, 'Painting', 'Wall touch-up or full room repainting', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(6, 'Furniture Repair', 'Fixing or replacing beds, chairs, tables, etc.', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(7, 'Pest Control', 'Treatment for insects, rodents, or other pests', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(8, 'Carpet Cleaning', 'Steam or spot cleaning of carpets', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(9, 'Window/Blind Repair', 'Fixing broken windows, curtains, or blinds', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57'),
(10, 'Technology Setup', 'TV, Wi-Fi, smart controls, or phone setup', 1, '2025-08-25 01:47:57', '2025-08-25 01:47:57');

-- --------------------------------------------------------

--
-- Table structure for table `room_status`
--

CREATE TABLE `room_status` (
  `room_status_id` int(11) NOT NULL,
  `status_name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_status`
--

INSERT INTO `room_status` (`room_status_id`, `status_name`, `description`) VALUES
(1, 'Available', NULL),
(2, 'Occupied', NULL),
(3, 'Reserved', NULL),
(4, 'Out of Order', NULL),
(5, 'Under Maintenance', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `room_types`
--

CREATE TABLE `room_types` (
  `room_type_id` int(11) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price_per_night` decimal(10,2) NOT NULL,
  `capacity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_types`
--

INSERT INTO `room_types` (`room_type_id`, `type_name`, `description`, `price_per_night`, `capacity`) VALUES
(1, 'Single Room', 'A room with a single bed for one person.', 1500.00, 1),
(2, 'Double Room', 'A room with one double bed for two people.', 2500.00, 2),
(3, 'Twin Room', 'A room with two single beds for two people.', 2600.00, 2),
(4, 'Triple Room', 'A room with three single beds or one double and one single.', 3500.00, 3),
(5, 'Queen Room', 'A room with a queen-size bed.', 2800.00, 2),
(6, 'King Room', 'A room with a king-size bed.', 3000.00, 2),
(7, 'Deluxe Room', 'A larger room with upscale amenities.', 4000.00, 2),
(8, 'Executive Room', 'A luxury room with work area and premium features.', 5000.00, 2),
(9, 'Suite', 'A spacious suite with separate living area.', 6000.00, 3),
(10, 'Family Room', 'Designed for families with multiple beds.', 4500.00, 4),
(11, 'Presidential Suite', 'Top-tier luxury suite with exclusive services.', 10000.00, 4),
(12, 'Universal Rooms', 'for intergalactic people', 1200.00, 10),
(13, 'Galaxy Room', 'Trip to Universe', 10000.00, 10);

-- --------------------------------------------------------

--
-- Table structure for table `service_requests`
--

CREATE TABLE `service_requests` (
  `request_id` int(11) NOT NULL,
  `request_type_id` int(11) NOT NULL,
  `request_status_id` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `request_time` datetime NOT NULL DEFAULT current_timestamp(),
  `reservation_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_requests`
--

INSERT INTO `service_requests` (`request_id`, `request_type_id`, `request_status_id`, `assigned_to`, `total`, `request_time`, `reservation_id`, `created_at`, `updated_at`) VALUES
(23, 1, 1, NULL, 800.00, '2025-08-24 08:07:50', 24, '2025-08-24 08:07:50', '2025-08-24 08:07:50'),
(24, 1, 1, NULL, 0.00, '2025-08-24 09:58:34', 25, '2025-08-24 09:58:34', '2025-08-24 09:58:34'),
(25, 1, 1, NULL, 0.00, '2025-08-24 09:58:34', 25, '2025-08-24 09:58:34', '2025-08-24 09:58:34'),
(26, 1, 1, NULL, 0.00, '2025-08-24 09:58:34', 25, '2025-08-24 09:58:34', '2025-08-24 09:58:34'),
(27, 2, 1, NULL, 320.00, '2025-08-24 11:51:13', 27, '2025-08-24 11:51:13', '2025-08-24 11:51:13'),
(28, 2, 1, NULL, 320.00, '2025-08-24 14:06:53', 28, '2025-08-24 14:06:53', '2025-08-24 14:06:53'),
(29, 2, 1, NULL, 270.00, '2025-08-24 14:06:53', 28, '2025-08-24 14:06:53', '2025-08-24 14:06:53'),
(30, 2, 1, NULL, 100.00, '2025-08-24 14:06:53', 28, '2025-08-24 14:06:53', '2025-08-24 14:06:53'),
(31, 2, 1, NULL, 30.00, '2025-08-24 14:06:53', 28, '2025-08-24 14:06:53', '2025-08-24 14:06:53'),
(32, 2, 1, NULL, 690.00, '2025-08-24 14:06:53', 28, '2025-08-24 14:06:53', '2025-08-24 14:06:53'),
(33, 1, 1, NULL, 0.00, '2025-08-24 23:04:29', 29, '2025-08-24 23:04:29', '2025-08-24 23:04:29'),
(34, 1, 1, NULL, 0.00, '2025-08-24 23:04:29', 29, '2025-08-24 23:04:29', '2025-08-24 23:04:29'),
(35, 1, 1, NULL, 0.00, '2025-08-25 04:53:54', 30, '2025-08-25 04:53:54', '2025-08-25 04:53:54'),
(36, 1, 1, NULL, 0.00, '2025-08-25 04:53:54', 30, '2025-08-25 04:53:54', '2025-08-25 04:53:54'),
(37, 1, 1, NULL, 0.00, '2025-08-25 04:53:54', 30, '2025-08-25 04:53:54', '2025-08-25 04:53:54'),
(38, 1, 1, NULL, 0.00, '2025-08-25 04:53:54', 30, '2025-08-25 04:53:54', '2025-08-25 04:53:54'),
(39, 1, 1, NULL, 100.00, '2025-08-25 04:53:54', 30, '2025-08-25 04:53:54', '2025-08-25 04:53:54');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`role_id`, `role_name`) VALUES
(1, 'Admin'),
(2, 'Front Desk'),
(3, 'Handyman');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `session_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `last_activity` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `advance_payments`
--
ALTER TABLE `advance_payments`
  ADD PRIMARY KEY (`advance_payment_id`),
  ADD KEY `payment_method_id` (`payment_method_id`),
  ADD KEY `idx_advance_payments_reservation` (`reservation_id`),
  ADD KEY `idx_advance_payments_status` (`payment_status_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`employee_id`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `extra_charges`
--
ALTER TABLE `extra_charges`
  ADD PRIMARY KEY (`extra_charges_id`),
  ADD KEY `request_id` (`request_id`);

--
-- Indexes for table `hotel_services`
--
ALTER TABLE `hotel_services`
  ADD PRIMARY KEY (`service_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`invoice_id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `reservation_id` (`reservation_id`),
  ADD KEY `fk_employee` (`employee_id`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`invoice_item_id`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Indexes for table `maintenance_status`
--
ALTER TABLE `maintenance_status`
  ADD PRIMARY KEY (`maintenance_status_id`);

--
-- Indexes for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`menu_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Indexes for table `payment_logs`
--
ALTER TABLE `payment_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_invoice_id` (`invoice_id`),
  ADD KEY `idx_recorded_at` (`recorded_at`),
  ADD KEY `idx_action_type` (`action_type`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Indexes for table `payment_methods`
--
ALTER TABLE `payment_methods`
  ADD PRIMARY KEY (`payment_method_id`);

--
-- Indexes for table `payment_status`
--
ALTER TABLE `payment_status`
  ADD PRIMARY KEY (`payment_status_id`);

--
-- Indexes for table `request_items`
--
ALTER TABLE `request_items`
  ADD PRIMARY KEY (`request_items_id`),
  ADD KEY `menu_id` (`menu_id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `fk_request_items_service_requests` (`request_id`);

--
-- Indexes for table `request_status`
--
ALTER TABLE `request_status`
  ADD PRIMARY KEY (`request_status_id`);

--
-- Indexes for table `request_types`
--
ALTER TABLE `request_types`
  ADD PRIMARY KEY (`request_type_id`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`reservation_id`),
  ADD KEY `reservation_type_id` (`reservation_type_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `reservation_status_id` (`reservation_status_id`),
  ADD KEY `idx_reservations_room_type_dates` (`room_type_id`,`checkin_datetime`,`checkout_datetime`),
  ADD KEY `idx_reservations_booking_type` (`booking_type`);

--
-- Indexes for table `reservation_logs`
--
ALTER TABLE `reservation_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_reservation_id` (`reservation_id`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_action_type` (`action_type`);

--
-- Indexes for table `reservation_status`
--
ALTER TABLE `reservation_status`
  ADD PRIMARY KEY (`reservation_status_id`);

--
-- Indexes for table `reservation_type`
--
ALTER TABLE `reservation_type`
  ADD PRIMARY KEY (`reservation_type_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`room_id`),
  ADD KEY `room_type_id` (`room_type_id`),
  ADD KEY `room_status_id` (`room_status_id`);

--
-- Indexes for table `room_amenities`
--
ALTER TABLE `room_amenities`
  ADD PRIMARY KEY (`amenity_id`),
  ADD UNIQUE KEY `amenity_name` (`amenity_name`),
  ADD KEY `idx_room_amenities_name` (`amenity_name`),
  ADD KEY `idx_room_amenities_active` (`is_active`);

--
-- Indexes for table `room_amenities_mapping`
--
ALTER TABLE `room_amenities_mapping`
  ADD PRIMARY KEY (`mapping_id`),
  ADD UNIQUE KEY `room_amenity_unique` (`room_id`,`amenity_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `amenity_id` (`amenity_id`),
  ADD KEY `idx_room_amenities_mapping_room_id` (`room_id`),
  ADD KEY `idx_room_amenities_mapping_amenity_id` (`amenity_id`);

--
-- Indexes for table `room_assignments`
--
ALTER TABLE `room_assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `idx_reservation_room` (`reservation_id`,`room_id`);

--
-- Indexes for table `room_maintenance_log`
--
ALTER TABLE `room_maintenance_log`
  ADD PRIMARY KEY (`maintenance_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `maintenance_status_id` (`maintenance_status_id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `room_maintenance_type`
--
ALTER TABLE `room_maintenance_type`
  ADD PRIMARY KEY (`maintenance_type_id`),
  ADD UNIQUE KEY `unique_type_name` (`type_name`);

--
-- Indexes for table `room_status`
--
ALTER TABLE `room_status`
  ADD PRIMARY KEY (`room_status_id`),
  ADD UNIQUE KEY `status_name` (`status_name`);

--
-- Indexes for table `room_types`
--
ALTER TABLE `room_types`
  ADD PRIMARY KEY (`room_type_id`);

--
-- Indexes for table `service_requests`
--
ALTER TABLE `service_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `request_type_id` (`request_type_id`),
  ADD KEY `request_status_id` (`request_status_id`),
  ADD KEY `assigned_to` (`assigned_to`),
  ADD KEY `fk_service_requests_reservations` (`reservation_id`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`employee_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `advance_payments`
--
ALTER TABLE `advance_payments`
  MODIFY `advance_payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `employee_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `extra_charges`
--
ALTER TABLE `extra_charges`
  MODIFY `extra_charges_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hotel_services`
--
ALTER TABLE `hotel_services`
  MODIFY `service_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `invoice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `invoice_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `maintenance_status`
--
ALTER TABLE `maintenance_status`
  MODIFY `maintenance_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `menu_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `payment_logs`
--
ALTER TABLE `payment_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `payment_method_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `payment_status`
--
ALTER TABLE `payment_status`
  MODIFY `payment_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `request_items`
--
ALTER TABLE `request_items`
  MODIFY `request_items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `request_status`
--
ALTER TABLE `request_status`
  MODIFY `request_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `request_types`
--
ALTER TABLE `request_types`
  MODIFY `request_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `reservation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `reservation_logs`
--
ALTER TABLE `reservation_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `reservation_status`
--
ALTER TABLE `reservation_status`
  MODIFY `reservation_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `reservation_type`
--
ALTER TABLE `reservation_type`
  MODIFY `reservation_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `room_amenities`
--
ALTER TABLE `room_amenities`
  MODIFY `amenity_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `room_amenities_mapping`
--
ALTER TABLE `room_amenities_mapping`
  MODIFY `mapping_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1235;

--
-- AUTO_INCREMENT for table `room_assignments`
--
ALTER TABLE `room_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `room_maintenance_log`
--
ALTER TABLE `room_maintenance_log`
  MODIFY `maintenance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `room_maintenance_type`
--
ALTER TABLE `room_maintenance_type`
  MODIFY `maintenance_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `room_status`
--
ALTER TABLE `room_status`
  MODIFY `room_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `room_types`
--
ALTER TABLE `room_types`
  MODIFY `room_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `service_requests`
--
ALTER TABLE `service_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `advance_payments`
--
ALTER TABLE `advance_payments`
  ADD CONSTRAINT `advance_payments_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `advance_payments_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`payment_method_id`),
  ADD CONSTRAINT `advance_payments_ibfk_3` FOREIGN KEY (`payment_status_id`) REFERENCES `payment_status` (`payment_status_id`);

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`role_id`);

--
-- Constraints for table `extra_charges`
--
ALTER TABLE `extra_charges`
  ADD CONSTRAINT `extra_charges_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`request_id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE CASCADE;

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_logs`
--
ALTER TABLE `payment_logs`
  ADD CONSTRAINT `payment_logs_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payment_logs_ibfk_2` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE SET NULL;

--
-- Constraints for table `request_items`
--
ALTER TABLE `request_items`
  ADD CONSTRAINT `fk_request_items_service_requests` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`request_id`),
  ADD CONSTRAINT `request_items_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menu_items` (`menu_id`),
  ADD CONSTRAINT `request_items_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `hotel_services` (`service_id`);

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`reservation_type_id`) REFERENCES `reservation_type` (`reservation_type_id`),
  ADD CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `reservations_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `reservations_ibfk_5` FOREIGN KEY (`reservation_status_id`) REFERENCES `reservation_status` (`reservation_status_id`);

--
-- Constraints for table `reservation_logs`
--
ALTER TABLE `reservation_logs`
  ADD CONSTRAINT `reservation_logs_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`);

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`),
  ADD CONSTRAINT `rooms_ibfk_2` FOREIGN KEY (`room_status_id`) REFERENCES `room_status` (`room_status_id`);

--
-- Constraints for table `room_amenities_mapping`
--
ALTER TABLE `room_amenities_mapping`
  ADD CONSTRAINT `room_amenities_mapping_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `room_amenities_mapping_ibfk_2` FOREIGN KEY (`amenity_id`) REFERENCES `room_amenities` (`amenity_id`) ON DELETE CASCADE;

--
-- Constraints for table `room_assignments`
--
ALTER TABLE `room_assignments`
  ADD CONSTRAINT `room_assignments_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`),
  ADD CONSTRAINT `room_assignments_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`);

--
-- Constraints for table `room_maintenance_log`
--
ALTER TABLE `room_maintenance_log`
  ADD CONSTRAINT `fk_maintenance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `room_maintenance_log_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `room_maintenance_log_ibfk_2` FOREIGN KEY (`maintenance_status_id`) REFERENCES `maintenance_status` (`maintenance_status_id`),
  ADD CONSTRAINT `room_maintenance_log_ibfk_3` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `service_requests`
--
ALTER TABLE `service_requests`
  ADD CONSTRAINT `fk_service_requests_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `employees` (`employee_id`),
  ADD CONSTRAINT `fk_service_requests_reservations` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`),
  ADD CONSTRAINT `service_requests_ibfk_1` FOREIGN KEY (`request_type_id`) REFERENCES `request_types` (`request_type_id`),
  ADD CONSTRAINT `service_requests_ibfk_2` FOREIGN KEY (`request_status_id`) REFERENCES `request_status` (`request_status_id`);

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_user_sessions_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
