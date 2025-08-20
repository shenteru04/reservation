-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 21, 2025 at 01:34 AM
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
(4, 12, 2000.00, 2, 3, '543463545345345', NULL, 'Advance payment for reservation - Reference: 543463545345345', '2025-08-18 06:46:39', '2025-08-18 06:46:39'),
(5, 13, 2275.00, 2, 3, '543463545345345', '2025-08-18 19:52:22', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-18 11:52:22', '2025-08-18 11:52:22'),
(6, 14, 2345.00, 2, 3, '543463545345345', '2025-08-18 19:56:39', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-18 11:56:39', '2025-08-18 11:56:39'),
(7, 15, 600.00, 2, 3, '543463545345345', '2025-08-19 04:49:35', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-18 20:49:35', '2025-08-18 20:49:35'),
(8, 16, 5000.00, 2, 3, '543463545345345', '2025-08-19 09:15:52', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-19 01:15:52', '2025-08-19 01:15:52'),
(9, 17, 2000.00, 2, 3, '543463545345345', '2025-08-20 07:53:01', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-19 23:53:01', '2025-08-19 23:53:01'),
(10, 18, 3245.00, 2, 3, '543463545345345', '2025-08-20 13:40:02', 'Advance payment for reservation - Reference: 543463545345345', '2025-08-20 05:40:02', '2025-08-20 05:40:02'),
(11, 19, 2455.00, 1, 3, '', '2025-08-20 14:54:17', 'Advance payment for reservation', '2025-08-20 06:54:17', '2025-08-20 06:54:17'),
(12, 20, 2000.00, 1, 3, '', '2025-08-20 15:15:58', 'Advance payment for reservation', '2025-08-20 07:15:58', '2025-08-20 07:15:58'),
(13, 21, 730.00, 2, 3, '62964926983628', '2025-08-20 18:31:12', 'Advance payment for reservation - Reference: 62964926983628', '2025-08-20 10:31:12', '2025-08-20 10:31:12'),
(14, 22, 2300.00, 2, 3, '62964926983628', '2025-08-20 18:46:18', 'Advance payment for reservation - Reference: 62964926983628', '2025-08-20 10:46:18', '2025-08-20 10:46:18');

-- --------------------------------------------------------

--
-- Table structure for table `billing`
--

CREATE TABLE `billing` (
  `billing_id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `paid_amount` decimal(10,2) DEFAULT NULL,
  `balance` decimal(10,2) DEFAULT NULL,
  `payment_status_id` int(11) DEFAULT NULL,
  `payment_method_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `employee_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(6, 'Shankai', 'Bai', 'shangkaibai@hotel.com', NULL, '0848395839', NULL, NULL),
(7, 'Gregor', 'Mac', 'macgregor@hotel.com', NULL, '09354623235', NULL, NULL),
(8, 'Christian', 'Boncales', 'christianboncales@gmail.com', NULL, '0966343734643', NULL, NULL),
(9, 'John Lester', 'Zarsosa', 'john@hotel.com', NULL, '0848395839', NULL, NULL),
(10, 'Gardo', 'vill', 'gardo@hotel.com', NULL, '24625462342642', NULL, NULL),
(11, 'Apple', 'Edrolin', 'apple@gmail.com', NULL, '09112034321342', NULL, NULL),
(12, 'Kenneth', 'Lopez', 'kennethlopez@gmail.com', NULL, '09123456789', NULL, NULL),
(13, 'Clint Denzel', 'Plaza', 'clintdenzelplaza@gmail.com', NULL, '09123456789', NULL, NULL),
(14, 'Arline', 'Boncales', 'arline@gmail.com', NULL, '09678714583', NULL, NULL),
(15, 'Haro', 'Kart', 'haro@gmail.com', NULL, '09678715483', NULL, NULL);

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
(1, 'admin@hotel.com', 'Admin', 'User', '09123456789', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, '2025-08-09 10:21:32', '2025-08-20 15:16:18'),
(2, 'christianboncales@gmail.com', 'Christian', 'Boncales', '23526234', '$2y$10$0DKMurz/LaIsoGOUuxcz.OahbOs20ymE3zoJy1u/TBmAxvXqacnNq', 2, 1, '2025-08-10 12:50:56', '2025-08-20 10:32:09'),
(5, 'clintplaza@gmail.com', 'Clint', 'Plaza', '542423324253', '$2y$10$n3i5bCjmyuyPW6TGWuULsu/qf69sQTzITSTZbXD6PNdi.Egqnjcdm', 3, 1, '2025-08-18 08:24:28', '2025-08-20 06:59:49');

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
-- Table structure for table `frontdesk_reports`
--

CREATE TABLE `frontdesk_reports` (
  `front_reports_id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `report_date` date NOT NULL,
  `summary` varchar(255) NOT NULL,
  `details` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `frontdesk_reports`
--

INSERT INTO `frontdesk_reports` (`front_reports_id`, `staff_id`, `report_date`, `summary`, `details`, `is_read`, `created_at`, `updated_at`) VALUES
(3, 2, '2025-08-19', 'fsdffsdfadfhkljdhkjhklbjkbjkbjkbjk', '{\"daily_notes\":\"bjkbjkbjkbjkbuivuifvuigbkhuihgjuihbu\",\"issues_encountered\":\"uibjkbjkbuijgvbuivbjkbjibvjuibvui\",\"recommendations\":\"vbjibvjkbjkbjkbjkbjkvuivuij\",\"submission_metadata\":{\"submitted_at\":\"2025-08-19T10:05:09.298Z\",\"dashboard_stats\":{\"total_reservations\":4,\"checkins_today\":2,\"checkouts_today\":0,\"revenue_today\":0,\"unpaid_balance\":10465,\"available_rooms\":0,\"occupied_rooms\":0,\"maintenance_rooms\":0,\"total_rooms\":0},\"user_agent\":\"Mozilla\\/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit\\/537.36 (KHTML, like Gecko) Chrome\\/139.0.0.0 Safari\\/537.36\",\"timezone\":\"Asia\\/Shanghai\"},\"submitted_by\":2,\"submission_timestamp\":\"2025-08-19T12:05:09+02:00\",\"ip_address\":\"::1\"}', 0, '2025-08-19 18:05:09', '2025-08-19 18:05:09');

-- --------------------------------------------------------

--
-- Table structure for table `hotel_services`
--

CREATE TABLE `hotel_services` (
  `service_id` int(11) NOT NULL,
  `service_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `fee` decimal(10,2) DEFAULT 0.00,
  `is_complimentary` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hotel_services`
--

INSERT INTO `hotel_services` (`service_id`, `service_name`, `description`, `fee`, `is_complimentary`) VALUES
(1, 'Laundry Service', 'Clothes picked up and returned within 24 hours', 150.00, 0),
(2, 'Wake-Up Call', 'Phone call to wake guest at requested time', 10.00, 1),
(3, 'Extra Pillow', 'Request for additional pillow', 10.00, 1),
(4, 'Extra Blanket', 'Request for extra blanket', 20.00, 1),
(5, 'Room Cleaning', 'Cleaning outside housekeeping schedule', 100.00, 1),
(6, 'Towel Replacement', 'Fresh towel delivered to room', 10.00, 1),
(7, 'Ironing Service', 'Clothes ironed upon request', 100.00, 0),
(8, 'Shoe Cleaning', 'Complimentary shoe shine service', 100.00, 1),
(9, 'Room Upgrade', 'Upgrade to next available room class', 1000.00, 0),
(10, 'Late Checkout', 'Extend checkout by 2 hours', 500.00, 0),
(11, 'Airport Shuttle', 'Ride to/from the airport', 800.00, 0),
(12, 'Extra Service', 'Different services', 100.00, 0);

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`invoice_id`, `invoice_number`, `reservation_id`, `total_amount`, `paid_amount`, `payment_status`, `due_date`, `notes`, `created_at`, `updated_at`) VALUES
(3, 'INV-2025080001', 16, 10960.00, 10000.00, 'Partial', '2025-08-26', 'Advance Payment', '2025-08-19 01:23:49', '2025-08-19 01:24:23');

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
(3, 3, 'Room charges and services', 1, 10960.00, 10960.00, 'room', '2025-08-19 01:23:49');

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
(23, 'American Cream', 'Include cream pies', 100.00, 'Desserts', 1, '2025-08-16 08:21:53', '2025-08-16 08:21:53');

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
(4, 3, 5000.00, 'gcash', '2025-08-18 19:24:23', 'PAY-1755566663', 'Payment recorded via front desk', '2025-08-19 01:24:23');

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
(3, 'Bank Transfer');

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
(3, 'Pending');

-- --------------------------------------------------------

--
-- Table structure for table `report_notifications`
--

CREATE TABLE `report_notifications` (
  `notif_id` int(11) NOT NULL,
  `report_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(13, 13, 16, NULL, 1),
(14, 14, 11, NULL, 1),
(15, 15, 1, NULL, 1),
(16, 16, 23, NULL, 1),
(17, 17, 11, NULL, 1),
(18, 18, 14, NULL, 1),
(19, 19, 6, NULL, 1),
(20, 20, 5, NULL, 1),
(21, 21, 7, NULL, 1);

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
  `customer_id` int(11) DEFAULT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
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

INSERT INTO `reservations` (`reservation_id`, `reservation_type_id`, `room_id`, `customer_id`, `check_in_date`, `check_out_date`, `reservation_status_id`, `total_amount`, `created_at`, `updated_at`, `advance_payment`, `guest_count`, `special_requests`) VALUES
(12, 2, 7, 8, '2025-08-18', '2025-08-19', 5, 4000.00, '2025-08-18 14:46:39', '2025-08-19 09:11:55', 2000.00, 3, ''),
(13, 2, 25, 8, '2025-08-20', '2025-08-21', 4, 4520.00, '2025-08-18 19:52:22', '2025-08-20 07:54:53', 2275.00, 1, ''),
(14, 2, 29, 6, '2025-08-18', '2025-08-19', 2, 4690.00, '2025-08-18 19:56:39', '2025-08-19 09:17:25', 2345.00, 1, ''),
(15, 1, 33, 2, '2025-08-19', '2025-08-21', 2, 2760.00, '2025-08-19 04:49:35', '2025-08-19 09:17:22', 600.00, 1, NULL),
(16, 1, 9, 9, '2025-08-19', '2025-08-20', 2, 10960.00, '2025-08-19 09:15:52', '2025-08-19 09:17:17', 5000.00, 1, NULL),
(17, 2, 7, 8, '2025-08-19', '2025-08-20', 1, 4000.00, '2025-08-20 07:53:01', '2025-08-20 07:53:01', 2000.00, 1, ''),
(18, 2, 34, 11, '2025-08-21', '2025-08-24', 3, 12980.00, '2025-08-20 13:40:02', '2025-08-20 13:41:50', 3245.00, 2, ''),
(19, 2, 10, 12, '2025-08-21', '2025-08-22', 2, 4910.00, '2025-08-20 14:54:17', '2025-08-20 14:55:13', 2455.00, 1, ''),
(20, 2, 18, 13, '2025-08-21', '2025-08-22', 4, 4000.00, '2025-08-20 15:15:58', '2025-08-20 15:17:54', 2000.00, 2, ''),
(21, 2, 25, 14, '2025-08-20', '2025-08-21', 1, 2920.00, '2025-08-20 18:31:12', '2025-08-20 18:31:12', 730.00, 1, ''),
(22, 2, 31, 15, '2025-08-20', '2025-08-21', 1, 4600.00, '2025-08-20 18:46:18', '2025-08-20 18:46:18', 2300.00, 1, '');

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
(1, '101', 2, 1, 1),
(2, '102', 2, 1, 1),
(3, '103', 3, 1, 1),
(4, '104', 4, 1, 1),
(5, '105', 5, 1, 1),
(6, '201', 6, 1, 2),
(7, '202', 7, 3, 2),
(8, '203', 8, 1, 2),
(9, '204', 9, 3, 2),
(10, '205', 10, 3, 2),
(11, '301', 11, 1, 3),
(12, '302', 1, 1, 3),
(13, '303', 2, 1, 3),
(14, '304', 3, 1, 3),
(15, '305', 4, 1, 3),
(16, '401', 5, 1, 4),
(17, '402', 6, 1, 4),
(18, '403', 7, 4, 4),
(19, '404', 8, 1, 4),
(20, '405', 9, 1, 4),
(21, '501', 10, 1, 5),
(22, '502', 11, 1, 5),
(23, '503', 1, 1, 5),
(24, '504', 2, 1, 5),
(25, '505', 3, 3, 5),
(27, '206', 11, 1, 2),
(28, '601', 7, 3, 6),
(29, '602', 7, 3, 6),
(30, '603', 7, 1, 6),
(31, '604', 7, 3, 6),
(32, '605', 7, 1, 6),
(33, '1001', 12, 3, 10),
(34, '210', 7, 2, 2);

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
(1, 7, 2, '2025-08-15 23:53:58'),
(2, 18, 2, '2025-08-15 23:53:58'),
(3, 28, 2, '2025-08-15 23:53:58'),
(4, 29, 2, '2025-08-15 23:53:58'),
(5, 30, 2, '2025-08-15 23:53:58'),
(6, 31, 2, '2025-08-15 23:53:58'),
(7, 32, 2, '2025-08-15 23:53:58'),
(8, 8, 2, '2025-08-15 23:53:58'),
(9, 19, 2, '2025-08-15 23:53:58'),
(10, 9, 2, '2025-08-15 23:53:58'),
(11, 20, 2, '2025-08-15 23:53:58'),
(12, 11, 2, '2025-08-15 23:53:58'),
(13, 22, 2, '2025-08-15 23:53:58'),
(14, 27, 2, '2025-08-15 23:53:58'),
(15, 7, 6, '2025-08-15 23:53:58'),
(16, 18, 6, '2025-08-15 23:53:58'),
(17, 28, 6, '2025-08-15 23:53:58'),
(18, 29, 6, '2025-08-15 23:53:58'),
(19, 30, 6, '2025-08-15 23:53:58'),
(20, 31, 6, '2025-08-15 23:53:58'),
(21, 32, 6, '2025-08-15 23:53:58'),
(22, 8, 6, '2025-08-15 23:53:58'),
(23, 19, 6, '2025-08-15 23:53:58'),
(24, 9, 6, '2025-08-15 23:53:58'),
(25, 20, 6, '2025-08-15 23:53:58'),
(26, 11, 6, '2025-08-15 23:53:58'),
(27, 22, 6, '2025-08-15 23:53:58'),
(28, 27, 6, '2025-08-15 23:53:58'),
(29, 7, 7, '2025-08-15 23:53:58'),
(30, 18, 7, '2025-08-15 23:53:58'),
(31, 28, 7, '2025-08-15 23:53:58'),
(32, 29, 7, '2025-08-15 23:53:58'),
(33, 30, 7, '2025-08-15 23:53:58'),
(34, 31, 7, '2025-08-15 23:53:58'),
(35, 32, 7, '2025-08-15 23:53:58'),
(36, 8, 7, '2025-08-15 23:53:58'),
(37, 19, 7, '2025-08-15 23:53:58'),
(38, 9, 7, '2025-08-15 23:53:58'),
(39, 20, 7, '2025-08-15 23:53:58'),
(40, 11, 7, '2025-08-15 23:53:58'),
(41, 22, 7, '2025-08-15 23:53:58'),
(42, 27, 7, '2025-08-15 23:53:58'),
(43, 7, 16, '2025-08-15 23:53:58'),
(44, 18, 16, '2025-08-15 23:53:58'),
(45, 28, 16, '2025-08-15 23:53:58'),
(46, 29, 16, '2025-08-15 23:53:58'),
(47, 30, 16, '2025-08-15 23:53:58'),
(48, 31, 16, '2025-08-15 23:53:58'),
(49, 32, 16, '2025-08-15 23:53:58'),
(50, 8, 16, '2025-08-15 23:53:58'),
(51, 19, 16, '2025-08-15 23:53:58'),
(52, 9, 16, '2025-08-15 23:53:58'),
(53, 20, 16, '2025-08-15 23:53:58'),
(54, 11, 16, '2025-08-15 23:53:58'),
(55, 22, 16, '2025-08-15 23:53:58'),
(56, 27, 16, '2025-08-15 23:53:58'),
(57, 7, 11, '2025-08-15 23:53:58'),
(58, 18, 11, '2025-08-15 23:53:58'),
(59, 28, 11, '2025-08-15 23:53:58'),
(60, 29, 11, '2025-08-15 23:53:58'),
(61, 30, 11, '2025-08-15 23:53:58'),
(62, 31, 11, '2025-08-15 23:53:58'),
(63, 32, 11, '2025-08-15 23:53:58'),
(64, 8, 11, '2025-08-15 23:53:58'),
(65, 19, 11, '2025-08-15 23:53:58'),
(66, 9, 11, '2025-08-15 23:53:58'),
(67, 20, 11, '2025-08-15 23:53:58'),
(68, 11, 11, '2025-08-15 23:53:58'),
(69, 22, 11, '2025-08-15 23:53:58'),
(70, 27, 11, '2025-08-15 23:53:58'),
(71, 7, 20, '2025-08-15 23:53:58'),
(72, 18, 20, '2025-08-15 23:53:58'),
(73, 28, 20, '2025-08-15 23:53:58'),
(74, 29, 20, '2025-08-15 23:53:58'),
(75, 30, 20, '2025-08-15 23:53:58'),
(76, 31, 20, '2025-08-15 23:53:58'),
(77, 32, 20, '2025-08-15 23:53:58'),
(78, 8, 20, '2025-08-15 23:53:58'),
(79, 19, 20, '2025-08-15 23:53:58'),
(80, 9, 20, '2025-08-15 23:53:58'),
(81, 20, 20, '2025-08-15 23:53:58'),
(82, 11, 20, '2025-08-15 23:53:58'),
(83, 22, 20, '2025-08-15 23:53:58'),
(84, 27, 20, '2025-08-15 23:53:58'),
(85, 7, 18, '2025-08-15 23:53:58'),
(86, 18, 18, '2025-08-15 23:53:58'),
(87, 28, 18, '2025-08-15 23:53:58'),
(88, 29, 18, '2025-08-15 23:53:58'),
(89, 30, 18, '2025-08-15 23:53:58'),
(90, 31, 18, '2025-08-15 23:53:58'),
(91, 32, 18, '2025-08-15 23:53:58'),
(92, 8, 18, '2025-08-15 23:53:58'),
(93, 19, 18, '2025-08-15 23:53:58'),
(94, 9, 18, '2025-08-15 23:53:58'),
(95, 20, 18, '2025-08-15 23:53:58'),
(96, 11, 18, '2025-08-15 23:53:58'),
(97, 22, 18, '2025-08-15 23:53:58'),
(98, 27, 18, '2025-08-15 23:53:58'),
(99, 7, 13, '2025-08-15 23:53:58'),
(100, 18, 13, '2025-08-15 23:53:58'),
(101, 28, 13, '2025-08-15 23:53:58'),
(102, 29, 13, '2025-08-15 23:53:58'),
(103, 30, 13, '2025-08-15 23:53:58'),
(104, 31, 13, '2025-08-15 23:53:58'),
(105, 32, 13, '2025-08-15 23:53:58'),
(106, 8, 13, '2025-08-15 23:53:58'),
(107, 19, 13, '2025-08-15 23:53:58'),
(108, 9, 13, '2025-08-15 23:53:58'),
(109, 20, 13, '2025-08-15 23:53:58'),
(110, 11, 13, '2025-08-15 23:53:58'),
(111, 22, 13, '2025-08-15 23:53:58'),
(112, 27, 13, '2025-08-15 23:53:58'),
(113, 7, 9, '2025-08-15 23:53:58'),
(114, 18, 9, '2025-08-15 23:53:58'),
(115, 28, 9, '2025-08-15 23:53:58'),
(116, 29, 9, '2025-08-15 23:53:58'),
(117, 30, 9, '2025-08-15 23:53:58'),
(118, 31, 9, '2025-08-15 23:53:58'),
(119, 32, 9, '2025-08-15 23:53:58'),
(120, 8, 9, '2025-08-15 23:53:58'),
(121, 19, 9, '2025-08-15 23:53:58'),
(122, 9, 9, '2025-08-15 23:53:58'),
(123, 20, 9, '2025-08-15 23:53:58'),
(124, 11, 9, '2025-08-15 23:53:58'),
(125, 22, 9, '2025-08-15 23:53:58'),
(126, 27, 9, '2025-08-15 23:53:58'),
(127, 7, 10, '2025-08-15 23:53:58'),
(128, 18, 10, '2025-08-15 23:53:58'),
(129, 28, 10, '2025-08-15 23:53:58'),
(130, 29, 10, '2025-08-15 23:53:58'),
(131, 30, 10, '2025-08-15 23:53:58'),
(132, 31, 10, '2025-08-15 23:53:58'),
(133, 32, 10, '2025-08-15 23:53:58'),
(134, 8, 10, '2025-08-15 23:53:58'),
(135, 19, 10, '2025-08-15 23:53:58'),
(136, 9, 10, '2025-08-15 23:53:58'),
(137, 20, 10, '2025-08-15 23:53:58'),
(138, 11, 10, '2025-08-15 23:53:58'),
(139, 22, 10, '2025-08-15 23:53:58'),
(140, 27, 10, '2025-08-15 23:53:58'),
(141, 7, 4, '2025-08-15 23:53:58'),
(142, 18, 4, '2025-08-15 23:53:58'),
(143, 28, 4, '2025-08-15 23:53:58'),
(144, 29, 4, '2025-08-15 23:53:58'),
(145, 30, 4, '2025-08-15 23:53:58'),
(146, 31, 4, '2025-08-15 23:53:58'),
(147, 32, 4, '2025-08-15 23:53:58'),
(148, 8, 4, '2025-08-15 23:53:58'),
(149, 19, 4, '2025-08-15 23:53:58'),
(150, 9, 4, '2025-08-15 23:53:58'),
(151, 20, 4, '2025-08-15 23:53:58'),
(152, 11, 4, '2025-08-15 23:53:58'),
(153, 22, 4, '2025-08-15 23:53:58'),
(154, 27, 4, '2025-08-15 23:53:58'),
(155, 7, 12, '2025-08-15 23:53:58'),
(156, 18, 12, '2025-08-15 23:53:58'),
(157, 28, 12, '2025-08-15 23:53:58'),
(158, 29, 12, '2025-08-15 23:53:58'),
(159, 30, 12, '2025-08-15 23:53:58'),
(160, 31, 12, '2025-08-15 23:53:58'),
(161, 32, 12, '2025-08-15 23:53:58'),
(162, 8, 12, '2025-08-15 23:53:58'),
(163, 19, 12, '2025-08-15 23:53:58'),
(164, 9, 12, '2025-08-15 23:53:58'),
(165, 20, 12, '2025-08-15 23:53:58'),
(166, 11, 12, '2025-08-15 23:53:58'),
(167, 22, 12, '2025-08-15 23:53:58'),
(168, 27, 12, '2025-08-15 23:53:58'),
(169, 7, 5, '2025-08-15 23:53:58'),
(170, 18, 5, '2025-08-15 23:53:58'),
(171, 28, 5, '2025-08-15 23:53:58'),
(172, 29, 5, '2025-08-15 23:53:58'),
(173, 30, 5, '2025-08-15 23:53:58'),
(174, 31, 5, '2025-08-15 23:53:58'),
(175, 32, 5, '2025-08-15 23:53:58'),
(176, 8, 5, '2025-08-15 23:53:58'),
(177, 19, 5, '2025-08-15 23:53:58'),
(178, 9, 5, '2025-08-15 23:53:58'),
(179, 20, 5, '2025-08-15 23:53:58'),
(180, 11, 5, '2025-08-15 23:53:58'),
(181, 22, 5, '2025-08-15 23:53:58'),
(182, 27, 5, '2025-08-15 23:53:58'),
(183, 7, 8, '2025-08-15 23:53:58'),
(184, 18, 8, '2025-08-15 23:53:58'),
(185, 28, 8, '2025-08-15 23:53:58'),
(186, 29, 8, '2025-08-15 23:53:58'),
(187, 30, 8, '2025-08-15 23:53:58'),
(188, 31, 8, '2025-08-15 23:53:58'),
(189, 32, 8, '2025-08-15 23:53:58'),
(190, 8, 8, '2025-08-15 23:53:58'),
(191, 19, 8, '2025-08-15 23:53:58'),
(192, 9, 8, '2025-08-15 23:53:58'),
(193, 20, 8, '2025-08-15 23:53:58'),
(194, 11, 8, '2025-08-15 23:53:58'),
(195, 22, 8, '2025-08-15 23:53:58'),
(196, 27, 8, '2025-08-15 23:53:58'),
(197, 7, 15, '2025-08-15 23:53:58'),
(198, 18, 15, '2025-08-15 23:53:58'),
(199, 28, 15, '2025-08-15 23:53:58'),
(200, 29, 15, '2025-08-15 23:53:58'),
(201, 30, 15, '2025-08-15 23:53:58'),
(202, 31, 15, '2025-08-15 23:53:58'),
(203, 32, 15, '2025-08-15 23:53:58'),
(204, 8, 15, '2025-08-15 23:53:58'),
(205, 19, 15, '2025-08-15 23:53:58'),
(206, 9, 15, '2025-08-15 23:53:58'),
(207, 20, 15, '2025-08-15 23:53:58'),
(208, 11, 15, '2025-08-15 23:53:58'),
(209, 22, 15, '2025-08-15 23:53:58'),
(210, 27, 15, '2025-08-15 23:53:58'),
(211, 7, 3, '2025-08-15 23:53:58'),
(212, 18, 3, '2025-08-15 23:53:58'),
(213, 28, 3, '2025-08-15 23:53:58'),
(214, 29, 3, '2025-08-15 23:53:58'),
(215, 30, 3, '2025-08-15 23:53:58'),
(216, 31, 3, '2025-08-15 23:53:58'),
(217, 32, 3, '2025-08-15 23:53:58'),
(218, 8, 3, '2025-08-15 23:53:58'),
(219, 19, 3, '2025-08-15 23:53:58'),
(220, 9, 3, '2025-08-15 23:53:58'),
(221, 20, 3, '2025-08-15 23:53:58'),
(222, 11, 3, '2025-08-15 23:53:58'),
(223, 22, 3, '2025-08-15 23:53:58'),
(224, 27, 3, '2025-08-15 23:53:58'),
(225, 7, 19, '2025-08-15 23:53:58'),
(226, 18, 19, '2025-08-15 23:53:58'),
(227, 28, 19, '2025-08-15 23:53:58'),
(228, 29, 19, '2025-08-15 23:53:58'),
(229, 30, 19, '2025-08-15 23:53:58'),
(230, 31, 19, '2025-08-15 23:53:58'),
(231, 32, 19, '2025-08-15 23:53:58'),
(232, 8, 19, '2025-08-15 23:53:58'),
(233, 19, 19, '2025-08-15 23:53:58'),
(234, 9, 19, '2025-08-15 23:53:58'),
(235, 20, 19, '2025-08-15 23:53:58'),
(236, 11, 19, '2025-08-15 23:53:58'),
(237, 22, 19, '2025-08-15 23:53:58'),
(238, 27, 19, '2025-08-15 23:53:58'),
(239, 7, 17, '2025-08-15 23:53:58'),
(240, 18, 17, '2025-08-15 23:53:58'),
(241, 28, 17, '2025-08-15 23:53:58'),
(242, 29, 17, '2025-08-15 23:53:58'),
(243, 30, 17, '2025-08-15 23:53:58'),
(244, 31, 17, '2025-08-15 23:53:58'),
(245, 32, 17, '2025-08-15 23:53:58'),
(246, 8, 17, '2025-08-15 23:53:58'),
(247, 19, 17, '2025-08-15 23:53:58'),
(248, 9, 17, '2025-08-15 23:53:58'),
(249, 20, 17, '2025-08-15 23:53:58'),
(250, 11, 17, '2025-08-15 23:53:58'),
(251, 22, 17, '2025-08-15 23:53:58'),
(252, 27, 17, '2025-08-15 23:53:58'),
(253, 7, 14, '2025-08-15 23:53:58'),
(254, 18, 14, '2025-08-15 23:53:58'),
(255, 28, 14, '2025-08-15 23:53:58'),
(256, 29, 14, '2025-08-15 23:53:58'),
(257, 30, 14, '2025-08-15 23:53:58'),
(258, 31, 14, '2025-08-15 23:53:58'),
(259, 32, 14, '2025-08-15 23:53:58'),
(260, 8, 14, '2025-08-15 23:53:58'),
(261, 19, 14, '2025-08-15 23:53:58'),
(262, 9, 14, '2025-08-15 23:53:58'),
(263, 20, 14, '2025-08-15 23:53:58'),
(264, 11, 14, '2025-08-15 23:53:58'),
(265, 22, 14, '2025-08-15 23:53:58'),
(266, 27, 14, '2025-08-15 23:53:58'),
(267, 7, 1, '2025-08-15 23:53:58'),
(268, 18, 1, '2025-08-15 23:53:58'),
(269, 28, 1, '2025-08-15 23:53:58'),
(270, 29, 1, '2025-08-15 23:53:58'),
(271, 30, 1, '2025-08-15 23:53:58'),
(272, 31, 1, '2025-08-15 23:53:58'),
(273, 32, 1, '2025-08-15 23:53:58'),
(274, 8, 1, '2025-08-15 23:53:58'),
(275, 19, 1, '2025-08-15 23:53:58'),
(276, 9, 1, '2025-08-15 23:53:58'),
(277, 20, 1, '2025-08-15 23:53:58'),
(278, 11, 1, '2025-08-15 23:53:58'),
(279, 22, 1, '2025-08-15 23:53:58'),
(280, 27, 1, '2025-08-15 23:53:58'),
(512, 5, 2, '2025-08-15 23:53:58'),
(513, 16, 2, '2025-08-15 23:53:58'),
(514, 6, 2, '2025-08-15 23:53:58'),
(515, 17, 2, '2025-08-15 23:53:58'),
(516, 10, 2, '2025-08-15 23:53:58'),
(517, 21, 2, '2025-08-15 23:53:58'),
(518, 5, 7, '2025-08-15 23:53:58'),
(519, 16, 7, '2025-08-15 23:53:58'),
(520, 6, 7, '2025-08-15 23:53:58'),
(521, 17, 7, '2025-08-15 23:53:58'),
(522, 10, 7, '2025-08-15 23:53:58'),
(523, 21, 7, '2025-08-15 23:53:58'),
(524, 5, 16, '2025-08-15 23:53:58'),
(525, 16, 16, '2025-08-15 23:53:58'),
(526, 6, 16, '2025-08-15 23:53:58'),
(527, 17, 16, '2025-08-15 23:53:58'),
(528, 10, 16, '2025-08-15 23:53:58'),
(529, 21, 16, '2025-08-15 23:53:58'),
(530, 5, 11, '2025-08-15 23:53:58'),
(531, 16, 11, '2025-08-15 23:53:58'),
(532, 6, 11, '2025-08-15 23:53:58'),
(533, 17, 11, '2025-08-15 23:53:58'),
(534, 10, 11, '2025-08-15 23:53:58'),
(535, 21, 11, '2025-08-15 23:53:58'),
(536, 5, 20, '2025-08-15 23:53:58'),
(537, 16, 20, '2025-08-15 23:53:58'),
(538, 6, 20, '2025-08-15 23:53:58'),
(539, 17, 20, '2025-08-15 23:53:58'),
(540, 10, 20, '2025-08-15 23:53:58'),
(541, 21, 20, '2025-08-15 23:53:58'),
(542, 5, 18, '2025-08-15 23:53:58'),
(543, 16, 18, '2025-08-15 23:53:58'),
(544, 6, 18, '2025-08-15 23:53:58'),
(545, 17, 18, '2025-08-15 23:53:58'),
(546, 10, 18, '2025-08-15 23:53:58'),
(547, 21, 18, '2025-08-15 23:53:58'),
(548, 5, 13, '2025-08-15 23:53:58'),
(549, 16, 13, '2025-08-15 23:53:58'),
(550, 6, 13, '2025-08-15 23:53:58'),
(551, 17, 13, '2025-08-15 23:53:58'),
(552, 10, 13, '2025-08-15 23:53:58'),
(553, 21, 13, '2025-08-15 23:53:58'),
(554, 5, 9, '2025-08-15 23:53:58'),
(555, 16, 9, '2025-08-15 23:53:58'),
(556, 6, 9, '2025-08-15 23:53:58'),
(557, 17, 9, '2025-08-15 23:53:58'),
(558, 10, 9, '2025-08-15 23:53:58'),
(559, 21, 9, '2025-08-15 23:53:58'),
(560, 5, 10, '2025-08-15 23:53:58'),
(561, 16, 10, '2025-08-15 23:53:58'),
(562, 6, 10, '2025-08-15 23:53:58'),
(563, 17, 10, '2025-08-15 23:53:58'),
(564, 10, 10, '2025-08-15 23:53:58'),
(565, 21, 10, '2025-08-15 23:53:58'),
(566, 5, 12, '2025-08-15 23:53:58'),
(567, 16, 12, '2025-08-15 23:53:58'),
(568, 6, 12, '2025-08-15 23:53:58'),
(569, 17, 12, '2025-08-15 23:53:58'),
(570, 10, 12, '2025-08-15 23:53:58'),
(571, 21, 12, '2025-08-15 23:53:58'),
(572, 5, 5, '2025-08-15 23:53:58'),
(573, 16, 5, '2025-08-15 23:53:58'),
(574, 6, 5, '2025-08-15 23:53:58'),
(575, 17, 5, '2025-08-15 23:53:58'),
(576, 10, 5, '2025-08-15 23:53:58'),
(577, 21, 5, '2025-08-15 23:53:58'),
(578, 5, 8, '2025-08-15 23:53:58'),
(579, 16, 8, '2025-08-15 23:53:58'),
(580, 6, 8, '2025-08-15 23:53:58'),
(581, 17, 8, '2025-08-15 23:53:58'),
(582, 10, 8, '2025-08-15 23:53:58'),
(583, 21, 8, '2025-08-15 23:53:58'),
(584, 5, 15, '2025-08-15 23:53:58'),
(585, 16, 15, '2025-08-15 23:53:58'),
(586, 6, 15, '2025-08-15 23:53:58'),
(587, 17, 15, '2025-08-15 23:53:58'),
(588, 10, 15, '2025-08-15 23:53:58'),
(589, 21, 15, '2025-08-15 23:53:58'),
(590, 5, 3, '2025-08-15 23:53:58'),
(591, 16, 3, '2025-08-15 23:53:58'),
(592, 6, 3, '2025-08-15 23:53:58'),
(593, 17, 3, '2025-08-15 23:53:58'),
(594, 10, 3, '2025-08-15 23:53:58'),
(595, 21, 3, '2025-08-15 23:53:58'),
(596, 5, 19, '2025-08-15 23:53:58'),
(597, 16, 19, '2025-08-15 23:53:58'),
(598, 6, 19, '2025-08-15 23:53:58'),
(599, 17, 19, '2025-08-15 23:53:58'),
(600, 10, 19, '2025-08-15 23:53:58'),
(601, 21, 19, '2025-08-15 23:53:58'),
(602, 5, 17, '2025-08-15 23:53:58'),
(603, 16, 17, '2025-08-15 23:53:58'),
(604, 6, 17, '2025-08-15 23:53:58'),
(605, 17, 17, '2025-08-15 23:53:58'),
(606, 10, 17, '2025-08-15 23:53:58'),
(607, 21, 17, '2025-08-15 23:53:58'),
(608, 5, 14, '2025-08-15 23:53:58'),
(609, 16, 14, '2025-08-15 23:53:58'),
(610, 6, 14, '2025-08-15 23:53:58'),
(611, 17, 14, '2025-08-15 23:53:58'),
(612, 10, 14, '2025-08-15 23:53:58'),
(613, 21, 14, '2025-08-15 23:53:58'),
(614, 5, 1, '2025-08-15 23:53:58'),
(615, 16, 1, '2025-08-15 23:53:58'),
(616, 6, 1, '2025-08-15 23:53:58'),
(617, 17, 1, '2025-08-15 23:53:58'),
(618, 10, 1, '2025-08-15 23:53:58'),
(619, 21, 1, '2025-08-15 23:53:58'),
(639, 2, 2, '2025-08-15 23:53:58'),
(640, 13, 2, '2025-08-15 23:53:58'),
(641, 24, 2, '2025-08-15 23:53:58'),
(643, 3, 2, '2025-08-15 23:53:58'),
(644, 14, 2, '2025-08-15 23:53:58'),
(645, 25, 2, '2025-08-15 23:53:58'),
(646, 4, 2, '2025-08-15 23:53:58'),
(647, 15, 2, '2025-08-15 23:53:58'),
(648, 2, 20, '2025-08-15 23:53:58'),
(649, 13, 20, '2025-08-15 23:53:58'),
(650, 24, 20, '2025-08-15 23:53:58'),
(652, 3, 20, '2025-08-15 23:53:58'),
(653, 14, 20, '2025-08-15 23:53:58'),
(654, 25, 20, '2025-08-15 23:53:58'),
(655, 4, 20, '2025-08-15 23:53:58'),
(656, 15, 20, '2025-08-15 23:53:58'),
(657, 2, 18, '2025-08-15 23:53:58'),
(658, 13, 18, '2025-08-15 23:53:58'),
(659, 24, 18, '2025-08-15 23:53:58'),
(661, 3, 18, '2025-08-15 23:53:58'),
(662, 14, 18, '2025-08-15 23:53:58'),
(663, 25, 18, '2025-08-15 23:53:58'),
(664, 4, 18, '2025-08-15 23:53:58'),
(665, 15, 18, '2025-08-15 23:53:58'),
(666, 2, 13, '2025-08-15 23:53:58'),
(667, 13, 13, '2025-08-15 23:53:58'),
(668, 24, 13, '2025-08-15 23:53:58'),
(670, 3, 13, '2025-08-15 23:53:58'),
(671, 14, 13, '2025-08-15 23:53:58'),
(672, 25, 13, '2025-08-15 23:53:58'),
(673, 4, 13, '2025-08-15 23:53:58'),
(674, 15, 13, '2025-08-15 23:53:58'),
(675, 2, 9, '2025-08-15 23:53:58'),
(676, 13, 9, '2025-08-15 23:53:58'),
(677, 24, 9, '2025-08-15 23:53:58'),
(679, 3, 9, '2025-08-15 23:53:58'),
(680, 14, 9, '2025-08-15 23:53:58'),
(681, 25, 9, '2025-08-15 23:53:58'),
(682, 4, 9, '2025-08-15 23:53:58'),
(683, 15, 9, '2025-08-15 23:53:58'),
(684, 2, 5, '2025-08-15 23:53:58'),
(685, 13, 5, '2025-08-15 23:53:58'),
(686, 24, 5, '2025-08-15 23:53:58'),
(688, 3, 5, '2025-08-15 23:53:58'),
(689, 14, 5, '2025-08-15 23:53:58'),
(690, 25, 5, '2025-08-15 23:53:58'),
(691, 4, 5, '2025-08-15 23:53:58'),
(692, 15, 5, '2025-08-15 23:53:58'),
(693, 2, 8, '2025-08-15 23:53:58'),
(694, 13, 8, '2025-08-15 23:53:58'),
(695, 24, 8, '2025-08-15 23:53:58'),
(697, 3, 8, '2025-08-15 23:53:58'),
(698, 14, 8, '2025-08-15 23:53:58'),
(699, 25, 8, '2025-08-15 23:53:58'),
(700, 4, 8, '2025-08-15 23:53:58'),
(701, 15, 8, '2025-08-15 23:53:58'),
(702, 2, 15, '2025-08-15 23:53:58'),
(703, 13, 15, '2025-08-15 23:53:58'),
(704, 24, 15, '2025-08-15 23:53:58'),
(706, 3, 15, '2025-08-15 23:53:58'),
(707, 14, 15, '2025-08-15 23:53:58'),
(708, 25, 15, '2025-08-15 23:53:58'),
(709, 4, 15, '2025-08-15 23:53:58'),
(710, 15, 15, '2025-08-15 23:53:58'),
(711, 2, 3, '2025-08-15 23:53:58'),
(712, 13, 3, '2025-08-15 23:53:58'),
(713, 24, 3, '2025-08-15 23:53:58'),
(715, 3, 3, '2025-08-15 23:53:58'),
(716, 14, 3, '2025-08-15 23:53:58'),
(717, 25, 3, '2025-08-15 23:53:58'),
(718, 4, 3, '2025-08-15 23:53:58'),
(719, 15, 3, '2025-08-15 23:53:58'),
(720, 2, 19, '2025-08-15 23:53:58'),
(721, 13, 19, '2025-08-15 23:53:58'),
(722, 24, 19, '2025-08-15 23:53:58'),
(724, 3, 19, '2025-08-15 23:53:58'),
(725, 14, 19, '2025-08-15 23:53:58'),
(726, 25, 19, '2025-08-15 23:53:58'),
(727, 4, 19, '2025-08-15 23:53:58'),
(728, 15, 19, '2025-08-15 23:53:58'),
(729, 2, 14, '2025-08-15 23:53:58'),
(730, 13, 14, '2025-08-15 23:53:58'),
(731, 24, 14, '2025-08-15 23:53:58'),
(733, 3, 14, '2025-08-15 23:53:58'),
(734, 14, 14, '2025-08-15 23:53:58'),
(735, 25, 14, '2025-08-15 23:53:58'),
(736, 4, 14, '2025-08-15 23:53:58'),
(737, 15, 14, '2025-08-15 23:53:58'),
(738, 2, 1, '2025-08-15 23:53:58'),
(739, 13, 1, '2025-08-15 23:53:58'),
(740, 24, 1, '2025-08-15 23:53:58'),
(742, 3, 1, '2025-08-15 23:53:58'),
(743, 14, 1, '2025-08-15 23:53:58'),
(744, 25, 1, '2025-08-15 23:53:58'),
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
(816, 34, 2, '2025-08-16 12:44:01'),
(817, 34, 20, '2025-08-16 12:44:01'),
(840, 33, 2, '2025-08-16 13:18:45'),
(841, 33, 6, '2025-08-16 13:18:45'),
(842, 33, 7, '2025-08-16 13:18:45'),
(843, 33, 16, '2025-08-16 13:18:45'),
(844, 33, 11, '2025-08-16 13:18:45'),
(845, 33, 20, '2025-08-16 13:18:45'),
(846, 33, 18, '2025-08-16 13:18:45'),
(847, 33, 13, '2025-08-16 13:18:45'),
(848, 33, 9, '2025-08-16 13:18:45'),
(849, 33, 10, '2025-08-16 13:18:45'),
(850, 33, 4, '2025-08-16 13:18:45'),
(851, 33, 12, '2025-08-16 13:18:45'),
(852, 33, 5, '2025-08-16 13:18:45'),
(853, 33, 8, '2025-08-16 13:18:45'),
(854, 33, 15, '2025-08-16 13:18:45'),
(855, 33, 3, '2025-08-16 13:18:45'),
(856, 33, 19, '2025-08-16 13:18:45'),
(857, 33, 17, '2025-08-16 13:18:45'),
(858, 33, 14, '2025-08-16 13:18:45'),
(859, 33, 1, '2025-08-16 13:18:45'),
(913, 1, 2, '2025-08-19 02:18:38'),
(914, 1, 6, '2025-08-19 02:18:38'),
(915, 1, 7, '2025-08-19 02:18:38'),
(916, 1, 16, '2025-08-19 02:18:38'),
(917, 1, 11, '2025-08-19 02:18:38'),
(918, 1, 20, '2025-08-19 02:18:38'),
(919, 1, 18, '2025-08-19 02:18:38'),
(920, 1, 13, '2025-08-19 02:18:38'),
(921, 1, 8, '2025-08-19 02:18:38'),
(922, 1, 15, '2025-08-19 02:18:38'),
(923, 1, 3, '2025-08-19 02:18:38'),
(924, 1, 19, '2025-08-19 02:18:38'),
(925, 1, 14, '2025-08-19 02:18:38'),
(926, 1, 1, '2025-08-19 02:18:38');

-- --------------------------------------------------------

--
-- Table structure for table `room_maintenance_log`
--

CREATE TABLE `room_maintenance_log` (
  `maintenance_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `maintenance_status_id` int(11) DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(12, 'Universal Rooms', 'for intergalactic people', 1200.00, 10);

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
(13, 2, 1, NULL, 120.00, '2025-08-19 04:49:35', 15, '2025-08-19 04:49:35', '2025-08-19 04:49:35'),
(14, 2, 1, NULL, 60.00, '2025-08-19 04:49:35', 15, '2025-08-19 04:49:35', '2025-08-19 04:49:35'),
(15, 2, 1, NULL, 320.00, '2025-08-19 09:15:52', 16, '2025-08-19 09:15:52', '2025-08-19 09:15:52'),
(16, 2, 1, NULL, 100.00, '2025-08-19 09:15:52', 16, '2025-08-19 09:15:52', '2025-08-19 09:15:52'),
(17, 2, 1, NULL, 60.00, '2025-08-19 09:15:52', 16, '2025-08-19 09:15:52', '2025-08-19 09:15:52'),
(18, 2, 1, NULL, 80.00, '2025-08-19 09:15:52', 16, '2025-08-19 09:15:52', '2025-08-19 09:15:52'),
(19, 2, 1, NULL, 690.00, '2025-08-19 09:15:52', 16, '2025-08-19 09:15:52', '2025-08-19 09:15:52'),
(20, 2, 1, NULL, 450.00, '2025-08-19 09:15:52', 16, '2025-08-19 09:15:52', '2025-08-19 09:15:52'),
(21, 2, 1, NULL, 780.00, '2025-08-19 09:15:52', 16, '2025-08-19 09:15:52', '2025-08-19 09:15:52');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `employee_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `employee_id`) VALUES
(1, 1),
(2, 2),
(4, 5);

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
  `user_id` int(11) NOT NULL,
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
-- Indexes for table `billing`
--
ALTER TABLE `billing`
  ADD PRIMARY KEY (`billing_id`),
  ADD KEY `reservation_id` (`reservation_id`),
  ADD KEY `payment_status_id` (`payment_status_id`),
  ADD KEY `payment_method_id` (`payment_method_id`),
  ADD KEY `employee_id` (`employee_id`);

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
-- Indexes for table `frontdesk_reports`
--
ALTER TABLE `frontdesk_reports`
  ADD PRIMARY KEY (`front_reports_id`),
  ADD KEY `staff_id` (`staff_id`),
  ADD KEY `report_date` (`report_date`),
  ADD KEY `is_read` (`is_read`);

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
  ADD KEY `reservation_id` (`reservation_id`);

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
-- Indexes for table `report_notifications`
--
ALTER TABLE `report_notifications`
  ADD PRIMARY KEY (`notif_id`),
  ADD KEY `report_id` (`report_id`),
  ADD KEY `recipient_id` (`recipient_id`),
  ADD KEY `is_read` (`is_read`);

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
  ADD KEY `reservation_status_id` (`reservation_status_id`);

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
-- Indexes for table `room_maintenance_log`
--
ALTER TABLE `room_maintenance_log`
  ADD PRIMARY KEY (`maintenance_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `maintenance_status_id` (`maintenance_status_id`),
  ADD KEY `employee_id` (`employee_id`);

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
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `employee_id` (`employee_id`);

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
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `advance_payments`
--
ALTER TABLE `advance_payments`
  MODIFY `advance_payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `billing`
--
ALTER TABLE `billing`
  MODIFY `billing_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
-- AUTO_INCREMENT for table `frontdesk_reports`
--
ALTER TABLE `frontdesk_reports`
  MODIFY `front_reports_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `hotel_services`
--
ALTER TABLE `hotel_services`
  MODIFY `service_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `invoice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `invoice_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `maintenance_status`
--
ALTER TABLE `maintenance_status`
  MODIFY `maintenance_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `menu_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `payment_method_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `payment_status`
--
ALTER TABLE `payment_status`
  MODIFY `payment_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `report_notifications`
--
ALTER TABLE `report_notifications`
  MODIFY `notif_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `request_items`
--
ALTER TABLE `request_items`
  MODIFY `request_items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

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
  MODIFY `reservation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

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
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `room_amenities`
--
ALTER TABLE `room_amenities`
  MODIFY `amenity_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `room_amenities_mapping`
--
ALTER TABLE `room_amenities_mapping`
  MODIFY `mapping_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=927;

--
-- AUTO_INCREMENT for table `room_maintenance_log`
--
ALTER TABLE `room_maintenance_log`
  MODIFY `maintenance_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `room_status`
--
ALTER TABLE `room_status`
  MODIFY `room_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `room_types`
--
ALTER TABLE `room_types`
  MODIFY `room_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `service_requests`
--
ALTER TABLE `service_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
-- Constraints for table `billing`
--
ALTER TABLE `billing`
  ADD CONSTRAINT `billing_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`),
  ADD CONSTRAINT `billing_ibfk_2` FOREIGN KEY (`payment_status_id`) REFERENCES `payment_status` (`payment_status_id`),
  ADD CONSTRAINT `billing_ibfk_3` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`payment_method_id`),
  ADD CONSTRAINT `billing_ibfk_4` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

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
-- Constraints for table `frontdesk_reports`
--
ALTER TABLE `frontdesk_reports`
  ADD CONSTRAINT `frontdesk_reports_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
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
-- Constraints for table `report_notifications`
--
ALTER TABLE `report_notifications`
  ADD CONSTRAINT `report_notifications_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `frontdesk_reports` (`front_reports_id`),
  ADD CONSTRAINT `report_notifications_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`);

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
-- Constraints for table `room_maintenance_log`
--
ALTER TABLE `room_maintenance_log`
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
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`);

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_user_sessions_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
