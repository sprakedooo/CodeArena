-- MySQL dump 10.13  Distrib 8.0.29, for Win64 (x86_64)
--
-- Host: localhost    Database: codearena
-- ------------------------------------------------------
-- Server version	8.0.29

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `codearena`
--

/*!40000 DROP DATABASE IF EXISTS `codearena`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `codearena` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `codearena`;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `feedback_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `language_code` varchar(20) NOT NULL,
  `overall_assessment` text,
  `weak_areas` json DEFAULT NULL,
  `strong_areas` json DEFAULT NULL,
  `next_steps` json DEFAULT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
INSERT INTO `feedback` VALUES (1,5,'python','Good progress in Python! You have more strengths than weaknesses. Focus on the areas identified below to achieve mastery.','[{\"topic\": \"Functions\", \"message\": \"You are finding Functions in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Create a simple function that greets a user by name. Then make one that adds two numbers.\"}]','[{\"topic\": \"Strings\", \"message\": \"Great job with Strings! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Comments\", \"message\": \"Great job with Comments! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Data Types\", \"message\": \"Great job with Data Types! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Input\", \"message\": \"Great job with Input! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Variables\", \"message\": \"Great job with Variables! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Output\", \"message\": \"Great job with Output! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Print\", \"message\": \"Great job with Print! You\'re showing strong understanding.\", \"accuracy\": 100}]','[\"Review the lesson on Functions\", \"Practice 5 more Functions questions\", \"Take short breaks between practice sessions\", \"Try explaining concepts out loud to yourself\"]','2026-02-16 17:47:19'),(2,5,'python','Good progress in Python! You have more strengths than weaknesses. Focus on the areas identified below to achieve mastery.','[{\"topic\": \"Functions\", \"message\": \"You\'re getting better at Functions in Python (50% accuracy), but there\'s room for improvement.\", \"accuracy\": 50, \"recommendation\": \"Create a simple function that greets a user by name. Then make one that adds two numbers.\"}, {\"topic\": \"Input\", \"message\": \"You are finding Input in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Write programs that ask the user for information and respond to it.\"}]','[{\"topic\": \"Output\", \"message\": \"Great job with Output! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Variables\", \"message\": \"Great job with Variables! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Data Types\", \"message\": \"Great job with Data Types! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Print\", \"message\": \"Great job with Print! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Comments\", \"message\": \"Great job with Comments! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Strings\", \"message\": \"Great job with Strings! You\'re showing strong understanding.\", \"accuracy\": 100}]','[\"Review the lesson on Functions\", \"Practice 5 more Functions questions\", \"Take short breaks between practice sessions\", \"Try explaining concepts out loud to yourself\"]','2026-02-17 03:34:40'),(3,5,'python','Good progress in Python! You have more strengths than weaknesses. Focus on the areas identified below to achieve mastery.','[{\"topic\": \"Functions\", \"message\": \"You\'re getting better at Functions in Python (50% accuracy), but there\'s room for improvement.\", \"accuracy\": 50, \"recommendation\": \"Create a simple function that greets a user by name. Then make one that adds two numbers.\"}, {\"topic\": \"Input\", \"message\": \"You are finding Input in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Write programs that ask the user for information and respond to it.\"}]','[{\"topic\": \"Output\", \"message\": \"Great job with Output! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Variables\", \"message\": \"Great job with Variables! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Data Types\", \"message\": \"Great job with Data Types! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Print\", \"message\": \"Great job with Print! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Comments\", \"message\": \"Great job with Comments! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Strings\", \"message\": \"Great job with Strings! You\'re showing strong understanding.\", \"accuracy\": 100}]','[\"Review the lesson on Functions\", \"Practice 5 more Functions questions\", \"Take short breaks between practice sessions\", \"Try explaining concepts out loud to yourself\"]','2026-02-17 03:34:53'),(4,5,'python','Good progress in Python! You have more strengths than weaknesses. Focus on the areas identified below to achieve mastery.','[{\"topic\": \"Variables\", \"message\": \"You are finding Variables in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Practice creating and modifying different types of variables. Try storing your name, age, and favorite number.\"}, {\"topic\": \"Input\", \"message\": \"You are finding Input in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Write programs that ask the user for information and respond to it.\"}, {\"topic\": \"Data Types\", \"message\": \"You are finding Data Types in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Create examples of each data type. Practice converting between types.\"}]','[{\"topic\": \"Strings\", \"message\": \"Great job with Strings! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Functions\", \"message\": \"Great job with Functions! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Print\", \"message\": \"Great job with Print! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Comments\", \"message\": \"Great job with Comments! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Output\", \"message\": \"Great job with Output! You\'re showing strong understanding.\", \"accuracy\": 100}]','[\"Review the lesson on Variables\", \"Practice 5 more Variables questions\", \"Take short breaks between practice sessions\", \"Try explaining concepts out loud to yourself\", \"Focus on one topic at a time for better retention\"]','2026-02-17 03:38:10'),(5,5,'python','You\'re still building your Python foundation. This is completely normal! Focus on one topic at a time and practice regularly.','[{\"topic\": \"Functions\", \"message\": \"You are finding Functions in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Create a simple function that greets a user by name. Then make one that adds two numbers.\"}]','[]','[\"Review the lesson on Functions\", \"Practice 5 more Functions questions\", \"Take short breaks between practice sessions\", \"Try explaining concepts out loud to yourself\"]','2026-02-17 03:39:03'),(6,5,'python','Outstanding performance in Python! You\'re showing strong understanding across all topics. Consider moving to more advanced challenges.','[]','[{\"topic\": \"Strings\", \"message\": \"Great job with Strings! You\'re showing strong understanding.\", \"accuracy\": 100}]','[\"Try more advanced level questions\", \"Help others learn to reinforce your knowledge\", \"Explore related programming concepts\"]','2026-02-17 07:36:02'),(7,5,'java','You\'re still building your Java foundation. This is completely normal! Focus on one topic at a time and practice regularly.','[{\"topic\": \"Main Method\", \"message\": \"You are finding Main Method in Java quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Review the lesson on Main Method and try the practice exercises. Focus on understanding WHY each concept works, not just memorizing syntax.\"}]','[]','[\"Review the lesson on Main Method\", \"Practice 5 more Main Method questions\", \"Take short breaks between practice sessions\", \"Try explaining concepts out loud to yourself\"]','2026-02-19 08:18:00'),(8,5,'python','Good progress in Python! You have more strengths than weaknesses. Focus on the areas identified below to achieve mastery.','[{\"topic\": \"Data Types\", \"message\": \"You are finding Data Types in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Create examples of each data type. Practice converting between types.\"}, {\"topic\": \"Output\", \"message\": \"You are finding Output in Python quite challenging (0% accuracy). This is a fundamental concept - let\'s focus on building a strong foundation here.\", \"accuracy\": 0, \"recommendation\": \"Practice printing different types of data. Try formatting your output neatly.\"}]','[{\"topic\": \"Comments\", \"message\": \"Great job with Comments! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Variables\", \"message\": \"Great job with Variables! You\'re showing strong understanding.\", \"accuracy\": 100}, {\"topic\": \"Input\", \"message\": \"Great job with Input! You\'re showing strong understanding.\", \"accuracy\": 100}]','[\"Review the lesson on Data Types\", \"Practice 5 more Data Types questions\", \"Take short breaks between practice sessions\", \"Try explaining concepts out loud to yourself\"]','2026-02-23 18:20:44');
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `progress`
--

DROP TABLE IF EXISTS `progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `progress` (
  `progress_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `language_code` varchar(20) NOT NULL,
  `current_level` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `questions_answered` int DEFAULT '0',
  `correct_answers` int DEFAULT '0',
  `consecutive_correct` int DEFAULT '0',
  `accuracy_percent` decimal(5,2) DEFAULT '0.00',
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`progress_id`),
  UNIQUE KEY `unique_user_language` (`user_id`,`language_code`),
  CONSTRAINT `progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `progress`
--

LOCK TABLES `progress` WRITE;
/*!40000 ALTER TABLE `progress` DISABLE KEYS */;
INSERT INTO `progress` VALUES (1,5,'python','beginner',60,44,0,73.33,'2026-02-23 18:20:43'),(2,5,'java','beginner',1,0,0,0.00,'2026-02-19 08:17:56');
/*!40000 ALTER TABLE `progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `language_code` varchar(20) NOT NULL,
  `level` enum('beginner','intermediate','advanced') NOT NULL,
  `topic` varchar(100) NOT NULL,
  `question_text` text NOT NULL,
  `options` json NOT NULL,
  `correct_answer` char(1) NOT NULL,
  `hint` text,
  `explanation` text,
  `points_value` int DEFAULT '10',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questions`
--

LOCK TABLES `questions` WRITE;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
INSERT INTO `questions` VALUES (1,'python','beginner','Variables','How do you create a variable named \"age\" with value 25 in Python?','[\"A) int age = 25\", \"B) age = 25\", \"C) var age = 25\", \"D) let age = 25\"]','B','Python does not require type declarations. Variables are created by simple assignment.','In Python, you simply write variable_name = value. No type keyword needed.',10,'2026-02-10 08:03:39'),(2,'python','beginner','Data Types','What is the data type of: x = \"Hello\"','[\"A) int\", \"B) float\", \"C) str\", \"D) char\"]','C','Text enclosed in quotes is called a string in Python.','Strings (str) are sequences of characters enclosed in quotes.',10,'2026-02-10 08:03:39'),(3,'python','beginner','Output','Which function is used to display output in Python?','[\"A) echo()\", \"B) console.log()\", \"C) print()\", \"D) System.out.println()\"]','C','The Python output function is simple and starts with \"p\".','print() is the built-in function for displaying output in Python.',10,'2026-02-10 08:03:39'),(4,'python','beginner','Comments','How do you write a single-line comment in Python?','[\"A) // comment\", \"B) /* comment */\", \"C) # comment\", \"D) -- comment\"]','C','Python uses a special symbol that looks like a hashtag.','The hash symbol (#) is used for single-line comments in Python.',10,'2026-02-10 08:03:39'),(5,'python','beginner','Input','Which function gets user input in Python?','[\"A) scan()\", \"B) read()\", \"C) input()\", \"D) get()\"]','C','The function name directly describes what it does - getting input.','input() reads a line of text from the user.',10,'2026-02-10 08:03:39'),(6,'python','intermediate','Loops','What does this code print?\nfor i in range(3):\n    print(i)','[\"A) 1 2 3\", \"B) 0 1 2\", \"C) 0 1 2 3\", \"D) 1 2\"]','B','range() starts from 0 by default and stops BEFORE the specified number.','range(3) generates 0, 1, 2 (three numbers starting from 0).',20,'2026-02-10 08:03:39'),(7,'python','intermediate','Conditionals','What keyword is used for \"else if\" in Python?','[\"A) else if\", \"B) elseif\", \"C) elif\", \"D) elsif\"]','C','Python combines \"else\" and \"if\" into a shorter keyword.','elif is Pythons way of writing else if.',20,'2026-02-10 08:03:39'),(8,'python','intermediate','Lists','How do you add an item to the end of a list in Python?','[\"A) list.add(item)\", \"B) list.append(item)\", \"C) list.push(item)\", \"D) list.insert(item)\"]','B','The method name suggests adding something at the end.','append() adds an element to the end of a list.',20,'2026-02-10 08:03:39'),(9,'python','intermediate','Functions','Which keyword is used to define a function in Python?','[\"A) function\", \"B) func\", \"C) def\", \"D) define\"]','C','Its a short form of \"define\".','def is used to define functions in Python.',20,'2026-02-10 08:03:39');
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rewards`
--

DROP TABLE IF EXISTS `rewards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rewards` (
  `reward_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `reward_type` enum('points','badge','level_up') NOT NULL,
  `points_amount` int DEFAULT '0',
  `badge_id` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `earned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reward_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `rewards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rewards`
--

LOCK TABLES `rewards` WRITE;
/*!40000 ALTER TABLE `rewards` DISABLE KEYS */;
/*!40000 ALTER TABLE `rewards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_answers`
--

DROP TABLE IF EXISTS `user_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_answers` (
  `answer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `question_id` int NOT NULL,
  `selected_answer` char(1) NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  `points_earned` int DEFAULT '0',
  `hint_shown` text,
  `answered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`answer_id`),
  KEY `user_id` (`user_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `user_answers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `user_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_answers`
--

LOCK TABLES `user_answers` WRITE;
/*!40000 ALTER TABLE `user_answers` DISABLE KEYS */;
INSERT INTO `user_answers` VALUES (3,5,5,'C',1,10,NULL,'2026-02-16 17:35:17'),(5,5,4,'A',0,0,'Python uses a special symbol that looks like a hashtag.','2026-02-16 17:35:33'),(6,5,3,'C',1,10,NULL,'2026-02-16 17:35:40'),(7,5,1,'B',1,10,NULL,'2026-02-16 17:35:45'),(8,5,2,'C',1,10,NULL,'2026-02-16 17:35:57'),(10,5,3,'C',1,10,NULL,'2026-02-16 17:36:48'),(11,5,4,'A',0,0,'Python uses a special symbol that looks like a hashtag.','2026-02-16 17:36:51'),(12,5,1,'B',1,10,NULL,'2026-02-16 17:36:56'),(13,5,5,'C',1,10,NULL,'2026-02-16 17:36:59'),(14,5,2,'C',1,10,NULL,'2026-02-16 17:37:01'),(15,5,4,'C',1,10,NULL,'2026-02-16 17:37:07'),(16,5,5,'C',1,10,NULL,'2026-02-16 17:37:17'),(17,5,1,'B',1,10,NULL,'2026-02-16 17:37:21'),(18,5,2,'C',1,10,NULL,'2026-02-16 17:37:25'),(19,5,3,'C',1,10,NULL,'2026-02-16 17:37:30'),(21,5,4,'C',1,10,NULL,'2026-02-16 17:46:47'),(22,5,2,'C',1,10,NULL,'2026-02-16 17:46:50'),(23,5,5,'C',1,10,NULL,'2026-02-16 17:46:53'),(24,5,1,'B',1,10,NULL,'2026-02-16 17:47:11'),(25,5,3,'C',1,10,NULL,'2026-02-16 17:47:14'),(27,5,3,'C',1,10,NULL,'2026-02-17 03:33:51'),(28,5,1,'B',1,10,NULL,'2026-02-17 03:34:04'),(29,5,2,'C',1,10,NULL,'2026-02-17 03:34:08'),(31,5,4,'C',1,10,NULL,'2026-02-17 03:34:27'),(32,5,5,'A',0,0,'The function name directly describes what it does - getting input.','2026-02-17 03:34:35'),(36,5,1,'A',0,0,'Python does not require type declarations. Variables are created by simple assignment.','2026-02-17 03:37:48'),(37,5,5,'B',0,0,'The function name directly describes what it does - getting input.','2026-02-17 03:37:51'),(38,5,4,'C',1,10,NULL,'2026-02-17 03:37:53'),(39,5,2,'D',0,0,'Text enclosed in quotes is called a string in Python.','2026-02-17 03:37:57'),(40,5,3,'C',1,10,NULL,'2026-02-17 03:38:01'),(42,5,4,'C',1,10,NULL,'2026-02-23 18:20:33'),(43,5,1,'B',1,10,NULL,'2026-02-23 18:20:35'),(44,5,5,'C',1,10,NULL,'2026-02-23 18:20:37'),(45,5,2,'D',0,0,'Text enclosed in quotes is called a string in Python.','2026-02-23 18:20:39'),(46,5,3,'A',0,0,'The Python output function is simple and starts with \"p\".','2026-02-23 18:20:43');
/*!40000 ALTER TABLE `user_answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `total_points` int DEFAULT '0',
  `current_level` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `badges` json DEFAULT NULL,
  `selected_language` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'student@example.com','$2b$10$dLLuQ6PAeBMStAPiV6JATO.aiNgLdgCz3x1enZsbs5U.IFWWcDGr.','Juan Dela Cruz',150,'beginner','[\"first_login\"]',NULL,'2026-02-10 08:03:39','2026-02-17 03:14:16'),(2,'maria@example.com','$2b$10$hZLSMiUP06n5G2G.RhS/fOAWwBEZm7qq6hBMhIadEc9YznMeAnKQy','Maria Santos',450,'intermediate','[\"first_login\", \"fast_learner\", \"perfect_score\"]',NULL,'2026-02-10 08:03:39','2026-02-17 03:14:16'),(5,'jubmanlunas@gmail.com','$2b$10$4ToDclJG5BDAklSd9oJ.L.HzvLXWsmNPLTeMUBFE8ez1.Tm218SJC','Jub Manlunas',0,'beginner',NULL,NULL,'2026-02-10 13:01:00','2026-02-23 18:42:57');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'codearena'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-01 23:47:37
