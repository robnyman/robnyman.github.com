<?php 
    $fileName = $_FILES['blobbie']['name'];
    $fileType = $_FILES['blobbie']['type'];
    $fileContent = file_get_contents($_FILES['blobbie']['tmp_name']);
    $dataURL = 'data:' . $fileType . ';base64,' . base64_encode($fileContent);
    echo $dataURL;
?>